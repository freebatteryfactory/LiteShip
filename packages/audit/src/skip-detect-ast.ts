/**
 * THE SOUND, AST-BASED SKIP DETECTOR — the cure that ends the token-scanner whack-a-mole.
 *
 * The token `detectSkips` (`@czap/gauntlet`'s dependency-free fallback) is a char/token
 * scanner. It cannot PARSE JavaScript, so each codex round found a new spelling it missed
 * (`it.concurrent.skip`, multi-line `.each([⏎…]).skip`, the ASI rebind `const t = it⏎t.skip`).
 * The cure is a REAL AST: `ts.createSourceFile` (the PARSER — we do NOT need a full
 * `ts.Program`/`TypeChecker`; the syntactic skip forms + LOCAL binding analysis are decidable
 * from the syntax tree alone). A real AST is line-AGNOSTIC, so every multi-line evasion is free.
 *
 * THE ARCHITECTURE BOUNDARY (load-bearing LAW). `@czap/gauntlet` is the LEAN engine — it carries
 * NO `typescript` dependency; the token `detectSkips` is its zero-capability fallback. `@czap/audit`
 * HAS `typescript`. So the AST detector lives HERE, and the no-skip gate / plumb-scan take it as
 * an INJECTED capability (`(context.skipDetector ?? detectSkips)(text)`) — the host (the CLI, which
 * deps `@czap/audit`) injects `detectSkipsAST`; the lean token detector stays as the fallback.
 *
 * WHAT IT RETURNS. The SAME `SkipMatch` shape the token detector returns (so it is a drop-in
 * for both consumers), EXTENDED with the `conditional` classification ({@link SkipConditionality}) —
 * the F2-soundness discriminant the token level cannot produce. An UNCONDITIONAL skip is a
 * placeholder (non-sanctionable regardless of title); a CONDITIONAL one is a signable capability gate.
 *
 * THE WALK (three cooperating passes over the ONE parsed tree):
 *  1. LOCAL BINDING ANALYSIS ({@link resolveRunnerBindings}) — a per-file fixpoint over the
 *     top-level + nested statements that resolves every runner ALIAS the syntax decides:
 *     import-rename (`import { it as spec }`), namespace (`import * as v`), local rebind
 *     (`const t = it`, transitive to a fixpoint), `.skip`-capture (`const skipIt = it.skip`),
 *     destructure (`const { skip } = it`), AND the ASI rebind (`const t = it⏎t.skip` — the AST has
 *     no ASI problem). The resolved sets feed the chain walk so an aliased root trips like a literal.
 *  2. THE CHAIN WALK ({@link visitForSkips}) — a full recursive AST visit (INTO describe/test block
 *     bodies, the token rewrite's fatal omission) that, at every `CallExpression` /
 *     `PropertyAccessExpression` / `ElementAccessExpression`, peels the access chain to its runner
 *     ROOT and recognises a terminal skip/disable member, a conditional member, a passthrough
 *     modifier, a bracket-string member, or a computed (suspicious) member.
 *  3. CONDITIONALITY ({@link classifyConditional}) — for each detected skip, an ANCESTOR walk that
 *     classifies it `skipIf`/`runIf` (the call member), `ternary` (a `?:` arm), `enclosing-if` (the
 *     skip is inside an `if (<cond>) { … }` body — the ancestor walk the token CANNOT do), or
 *     `unconditional`.
 *
 * THE PARSER-ONLY RESIDUAL (honest). A PARSER (no `TypeChecker`) cannot resolve a CROSS-MODULE
 * binding — `import { it as x } from "./local"` where `./local` re-exports vitest, a dynamic-import
 * destructure (`const { it } = await import("vitest")`), or a default-import-then-member
 * (`import vitest from "vitest"; vitest.it.skip(`). Those need full type/module resolution (the
 * `ts.Program` the host already builds for the IR). They are documented here, NOT silently passed:
 * the parser + LOCAL analysis covers the vast majority — the whole R4/R5/R6 corpus.
 *
 * Composition over inheritance: a match is the same flat `_tag`-free DATA record the token detector
 * emits; the walk is a standalone recursive fold over the parsed tree. No classes.
 *
 * @module
 */

import ts from 'typescript';
import type { SkipForm, SkipMatch, SkipConditionality } from '@czap/gauntlet';

/** Runner ROOTS a skip hangs off — mirrors the token detector's set (the literal call surfaces + focus aliases). */
const RUNNER_ROOTS: ReadonlySet<string> = new Set([
  'it',
  'test',
  'describe',
  'suite',
  'bench',
  'fit',
  'fdescribe',
  'specify',
  'fspecify',
]);

/** The legacy x-prefix DISABLE aliases — the bare identifier IS the skip (Jasmine/Mocha/Jest heritage). */
const X_DISABLE_ALIASES: ReadonlySet<string> = new Set(['xit', 'xtest', 'xdescribe', 'xspecify']);

/** Terminal SKIP/DISABLE members — `.skip` / `.todo` / `.fails` blanks/inverts the test. */
const SKIP_MEMBERS: ReadonlySet<string> = new Set(['skip', 'todo', 'fails']);

/** Runtime-CONDITIONAL members — `.skipIf(cond)` / `.runIf(cond)`; both ship the skipped arm green. */
const CONDITIONAL_MEMBERS: ReadonlySet<string> = new Set(['skipIf', 'runIf']);

/** Chain PASSTHROUGH modifiers — sit BETWEEN the root and a `skip` (`it.concurrent.skip`, `it.each([…]).skip`). */
const PASSTHROUGH_MEMBERS: ReadonlySet<string> = new Set(['concurrent', 'sequential', 'each', 'for', 'extend', 'only']);

/** Test-runner modules whose `import { it as x }` is a TRUSTED runner rename (decidable by the syntax). */
const RUNNER_MODULES: ReadonlySet<string> = new Set(['vitest', '@jest/globals', 'node:test', 'bun:test']);

/**
 * The resolved per-file LOCAL binding table — every runner alias the SYNTAX decides (no checker).
 * Built by {@link resolveRunnerBindings} as a fixpoint; consumed by the chain walk so an aliased
 * root / captured `.skip` / destructured member / namespace trips exactly like its literal form.
 */
interface RunnerBindings {
  /** Identifiers that resolve (≥1 hop) to a runner root — `import { it as spec }`, `const t = it`. */
  readonly roots: ReadonlySet<string>;
  /** Identifiers bound to a runner NAMESPACE (`import * as v from "vitest"`) — `v.it.skip` trips. */
  readonly namespaces: ReadonlySet<string>;
  /** Identifiers bound DIRECTLY to a skip accessor (`const skipIt = it.skip`) → the captured chain token. */
  readonly directSkips: ReadonlyMap<string, string>;
  /** Identifiers destructured AS a skip member (`const { skip } = it`) → the source chain token. */
  readonly bareSkips: ReadonlyMap<string, string>;
  /** Identifiers SUSPICIOUSLY rebound to a non-literal RHS mentioning a runner (`const t = cond ? it : x`). */
  readonly suspicious: ReadonlyMap<string, string>;
}

/**
 * THE PUBLIC ENTRY — parse `source` with `ts.createSourceFile`, resolve the local runner bindings,
 * then walk the tree for EVERY skip/disable form, each carrying its 1-based line + the structural
 * `conditional` classification. Drop-in for the token `detectSkips` (same `SkipMatch`
 * shape), extended with `conditional`. PURE — no I/O, no `ts.Program`, no checker.
 *
 * The file is parsed as `.tsx` with full JS support so type annotations (`const t: typeof it = it`),
 * JSX, and every modern syntax parse without a config. Parse errors do not throw (a malformed file
 * still yields a best-effort partial tree — the recovery parser); a structurally-broken file simply
 * surfaces fewer matches, never a crash.
 */
export function detectSkipsAST(source: string): readonly SkipMatch[] {
  const sourceFile = ts.createSourceFile(
    'skip-scan.tsx',
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TSX,
  );
  const bindings = resolveRunnerBindings(sourceFile);
  const matches: SkipMatch[] = [];
  visitForSkips(sourceFile, sourceFile, bindings, matches);
  return dedupe(matches);
}

// ---------------------------------------------------------------------------
// Pass 1 — LOCAL BINDING ANALYSIS (the alias fixpoint, syntax-decidable).
// ---------------------------------------------------------------------------

/**
 * Peel the TRANSPARENT value wrappers off an expression — parentheses, `x as T`, `x!`,
 * `x satisfies T`, and the `<T>x` type-assertion — down to the core value expression. A
 * runner ALIAS hides behind exactly these (`const { skip } = (it)`, `= it as typeof it`,
 * `= it!`): they change the TYPE-LEVEL view but not the runtime value, so they are
 * invisible to the binding resolver UNLESS peeled. Pure, syntax-only (the same
 * unwrap `peelAccessChain` already applies mid-chain — applied here at the binding sites too).
 */
function unwrapExpr(expr: ts.Expression): ts.Expression {
  let e: ts.Expression = expr;
  for (;;) {
    if (
      ts.isParenthesizedExpression(e) ||
      ts.isAsExpression(e) ||
      ts.isNonNullExpression(e) ||
      ts.isSatisfiesExpression(e) ||
      ts.isTypeAssertionExpression(e)
    ) {
      e = e.expression;
      continue;
    }
    break;
  }
  return e;
}

/**
 * Resolve every runner ALIAS the file's SYNTAX decides, as a fixpoint. Walks ALL declaration
 * statements (top-level AND nested in blocks/functions — a rebind can live inside a closure), then
 * closes the transitive `const a = it; const b = a` chain one hop per pass until no new binding appears.
 *
 * THE FIXPOINT covers EVERY binding kind together (roots, namespaces, destructured skips, captured
 * skips) so a binding that resolves through a PRIOR alias settles in a later pass — `const t = it;
 * const { skip } = t` (destructure off a RESOLVED root, not just a literal one) and `const w = v;
 * w.it.skip` (a namespace rebind). The initializer is always {@link unwrapExpr unwrapped} first, so a
 * paren / `as T` / `!` wrapper never hides the alias. Each collector returns whether it added a new
 * binding; the loop re-runs until none does (bounded by the declaration count). The SUSPICIOUS-ternary
 * pass runs LAST (after roots settle) so `const t = cond ? it : x` is judged against the FULL root set.
 *
 * The decidable forms (each PROVEN against the R4/R5/R6/R7 corpus):
 *  - `import { it as spec } from "vitest"` → `spec` is a root (line-agnostic: the AST has no
 *    multi-line specifier problem);
 *  - `import * as v from "vitest"` → `v` is a runner namespace (`v.it.skip` trips), AND a rebind of
 *    that namespace `const w = v` → `w` is a namespace too (`w.it.skip` trips);
 *  - `const t = it` / `let d = describe` (incl. `const t: typeof it = it`, `const t = (it)`,
 *    `const t = it as typeof it`) → `t`/`d` are roots, transitively to a fixpoint, AND the ASI form
 *    `const t = it⏎t.skip` (the AST sees `const t = it` as one statement regardless of the semicolon);
 *  - `const skipIt = it.skip` / `= t.skip` (off a resolved root) → `skipIt` is a DIRECT skip caller;
 *  - `const { skip } = it` / `= t` (off a resolved root) / `= (it)` → `skip` is a bare skip caller;
 *  - `const t = cond ? it : x` → `t` is SUSPICIOUS (a ternary arm IS the runner — flagged, not passed).
 */
function resolveRunnerBindings(sourceFile: ts.SourceFile): RunnerBindings {
  const roots = new Set<string>(RUNNER_ROOTS);
  const namespaces = new Set<string>();
  const directSkips = new Map<string, string>();
  const bareSkips = new Map<string, string>();
  const suspicious = new Map<string, string>();

  // Collect every import + variable declaration in the file (recursively — a rebind can be nested).
  const imports: ts.ImportDeclaration[] = [];
  const varDecls: ts.VariableDeclaration[] = [];
  const collect = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) imports.push(node);
    else if (ts.isVariableDeclaration(node)) varDecls.push(node);
    ts.forEachChild(node, collect);
  };
  collect(sourceFile);

  // Seed the root/namespace sets from imports (a renamed runner / a namespace from a trusted module).
  for (const imp of imports) collectImport(imp, roots, namespaces);

  // FIXPOINT over EVERY binding kind together — one hop per pass until nothing new resolves. Each
  // collector consults the GROWING `roots`/`namespaces` sets, so a transitive alias (a destructure or
  // capture off a binding resolved in an earlier pass) settles. Bounded by the declaration count.
  let changed = true;
  let guard = 0;
  const limit = varDecls.length + 2;
  while (changed && guard <= limit) {
    changed = false;
    guard++;
    for (const decl of varDecls) {
      if (collectRootRebind(decl, roots)) changed = true;
      if (collectNamespaceRebind(decl, namespaces)) changed = true;
      if (collectNamespaceMemberExtraction(decl, namespaces, roots)) changed = true;
      if (collectDestructuredSkip(decl, roots, bareSkips)) changed = true;
      if (collectDirectSkipCapture(decl, roots, directSkips)) changed = true;
    }
  }

  // SUSPICIOUS ternaries last — judged against the SETTLED root set (so an arm resolved late is seen).
  for (const decl of varDecls) collectSuspiciousTernary(decl, roots, suspicious);

  return { roots, namespaces, directSkips, bareSkips, suspicious };
}

/** The module specifier text of an import (`"vitest"`), or `undefined` if not a string literal. */
function importModuleName(imp: ts.ImportDeclaration): string | undefined {
  return ts.isStringLiteral(imp.moduleSpecifier) ? imp.moduleSpecifier.text : undefined;
}

/**
 * `import { it as spec } from "vitest"` → `spec` is a root (trusted runner module). `import * as v
 * from "vitest"` → `v` is a runner namespace.
 *
 * THE CROSS-MODULE RESIDUAL (documented, NOT flagged). A runner-NAMED import from an UNKNOWN module
 * — `import { describe } from "../commands/describe.js"` (the CLI command, NOT the runner),
 * `import { test } from "@playwright/test"`, `import { it as x } from "./local"` where `./local`
 * re-exports vitest — is UNDECIDABLE without full module/type resolution (the `ts.Program` the host
 * builds for the IR, not this parser). We do NOT add such a binding as a root NOR flag it suspicious:
 * flagging would flood a real repo with false positives on every ordinary `describe`/`test` call (the
 * CLI `describe` command, a Playwright `test`), exactly as the token detector deliberately leaves
 * them clean. The renamed-from-unknown form (`import { it as x }`) is likewise left clean. This is the
 * honest parser-only limit — the host's `ts.Program` is the complete fix.
 *
 * NOTE the literal runner roots (`it`/`test`/`describe`/…) are ALREADY in the base root set, so a
 * `<root>.skip(` chain on a vitest/Playwright import still trips via the literal name — the import
 * handler only needs to add RENAMED locals from a TRUSTED runner module.
 */
function collectImport(imp: ts.ImportDeclaration, roots: Set<string>, namespaces: Set<string>): void {
  const clause = imp.importClause;
  if (clause === undefined || clause.namedBindings === undefined) return;
  const moduleName = importModuleName(imp);
  const trusted = moduleName !== undefined && RUNNER_MODULES.has(moduleName);
  // `import * as v from "vitest"` — the namespace binding (only from a trusted runner module).
  if (ts.isNamespaceImport(clause.namedBindings)) {
    if (trusted) namespaces.add(clause.namedBindings.name.text);
    return;
  }
  // `import { it as spec, test as t2 } from "vitest"` — a RENAMED runner from a TRUSTED module adds
  // the local as a root. A non-renamed `import { it }` is a no-op (`it` is already a literal root).
  // An import from an UNKNOWN module is the documented cross-module residual: left clean (above).
  if (!trusted) return;
  for (const spec of clause.namedBindings.elements) {
    // `spec.propertyName` is the ORIGINAL name (`it`) when renamed; `spec.name` is the local binding.
    const original = (spec.propertyName ?? spec.name).text;
    if (!RUNNER_ROOTS.has(original)) continue;
    roots.add(spec.name.text);
  }
}

/**
 * `const t = it` / `let d = describe` (incl. `const t: typeof it = it`, `const t = (it)`,
 * `const t = it as typeof it`) → add the LHS as a root when the UNWRAPPED initializer is exactly a
 * known/resolved root identifier. Returns true when a NEW root was added (drives the transitive
 * fixpoint). The SUSPICIOUS-ternary case is handled separately ({@link collectSuspiciousTernary}),
 * after the root set settles, so its judgement sees the full transitive closure.
 */
function collectRootRebind(decl: ts.VariableDeclaration, roots: Set<string>): boolean {
  if (!ts.isIdentifier(decl.name)) return false;
  const lhs = decl.name.text;
  if (roots.has(lhs)) return false;
  if (decl.initializer === undefined) return false;
  // Clean alias: the UNWRAPPED initializer is exactly a known/resolved root identifier (the type
  // annotation, if any, is `decl.type` — a SEPARATE node, so it never contaminates the check; the
  // `as T`/`!`/paren wrappers are peeled by `unwrapExpr` so they never hide the alias).
  const init = unwrapExpr(decl.initializer);
  if (ts.isIdentifier(init) && roots.has(init.text)) {
    roots.add(lhs);
    return true;
  }
  return false;
}

/**
 * `const w = v` where `v` is a runner NAMESPACE (`import * as v from "vitest"`) → `w` is a namespace
 * too, so `w.it.skip` trips exactly like `v.it.skip`. The UNWRAPPED initializer must be an identifier
 * already in the namespace set; transitive (`const w = v; const u = w`) via the fixpoint. Returns true
 * when a NEW namespace binding was added.
 */
function collectNamespaceRebind(decl: ts.VariableDeclaration, namespaces: Set<string>): boolean {
  if (!ts.isIdentifier(decl.name)) return false;
  const lhs = decl.name.text;
  if (namespaces.has(lhs)) return false;
  if (decl.initializer === undefined) return false;
  const init = unwrapExpr(decl.initializer);
  if (ts.isIdentifier(init) && namespaces.has(init.text)) {
    namespaces.add(lhs);
    return true;
  }
  return false;
}

/**
 * Extract a runner ROOT from a NAMESPACE member into a local binding (codex round-8) — the namespace
 * analogue of {@link collectNamespaceRebind}:
 *  - `const spec = v.it` / `const spec = v["it"]` → `spec` is a root (a runner-root MEMBER off a
 *    namespace `v` — `import * as v from "vitest"`);
 *  - `const { it: spec } = v` / `const { it } = v` → the destructured local is a root.
 * Only a RUNNER_ROOTS member counts (so `const x = v.expect` / `const { vi } = v` add nothing — no
 * false positive on an ordinary namespace member). Returns true when a NEW root was added.
 */
function collectNamespaceMemberExtraction(
  decl: ts.VariableDeclaration,
  namespaces: ReadonlySet<string>,
  roots: Set<string>,
): boolean {
  if (decl.initializer === undefined) return false;
  const init = unwrapExpr(decl.initializer);
  // Form A: `const spec = v.it` — a runner-root member accessed off a namespace head.
  if (ts.isIdentifier(decl.name)) {
    const lhs = decl.name.text;
    if (roots.has(lhs)) return false;
    if (namespaceRunnerMember(init, namespaces) !== undefined) {
      roots.add(lhs);
      return true;
    }
    return false;
  }
  // Form B: `const { it: spec } = v` — destructure a runner root off a namespace.
  if (ts.isObjectBindingPattern(decl.name) && ts.isIdentifier(init) && namespaces.has(init.text)) {
    let added = false;
    for (const element of decl.name.elements) {
      const source =
        element.propertyName !== undefined && ts.isIdentifier(element.propertyName)
          ? element.propertyName.text
          : ts.isIdentifier(element.name)
            ? element.name.text
            : undefined;
      if (source === undefined || !RUNNER_ROOTS.has(source)) continue;
      const local = ts.isIdentifier(element.name) ? element.name.text : source;
      if (!roots.has(local)) {
        roots.add(local);
        added = true;
      }
    }
    return added;
  }
  return false;
}

/** If `expr` is `<namespace>.<runnerRoot>` (or `<namespace>["runnerRoot"]`), the runner member name; else undefined. */
function namespaceRunnerMember(expr: ts.Expression, namespaces: ReadonlySet<string>): string | undefined {
  if (
    ts.isPropertyAccessExpression(expr) &&
    ts.isIdentifier(expr.expression) &&
    namespaces.has(expr.expression.text) &&
    RUNNER_ROOTS.has(expr.name.text)
  ) {
    return expr.name.text;
  }
  if (
    ts.isElementAccessExpression(expr) &&
    ts.isIdentifier(expr.expression) &&
    namespaces.has(expr.expression.text) &&
    ts.isStringLiteralLike(expr.argumentExpression) &&
    RUNNER_ROOTS.has(expr.argumentExpression.text)
  ) {
    return expr.argumentExpression.text;
  }
  return undefined;
}

/**
 * Record `const t = cond ? it : x` as SUSPICIOUS — a ternary whose arm is a BARE runner root. Narrow
 * on purpose (the runner names are common ordinary identifiers). We do NOT flag when the OTHER arm
 * already carries a detectable skip chain (`cond ? it : it.skip`): that arm is recognised by the chain
 * walk at THIS declaration line (form `alias`), so flagging the alias too would double-report AND
 * mis-classify it `unconditional` at every later call — exactly the false positive that broke the
 * real-repo `const renderIt = FFMPEG ? it : it.skip` sanctioned sites. Runs after the root fixpoint
 * settles, so `roots` is the full transitive closure.
 */
function collectSuspiciousTernary(
  decl: ts.VariableDeclaration,
  roots: ReadonlySet<string>,
  suspicious: Map<string, string>,
): void {
  if (!ts.isIdentifier(decl.name)) return;
  const lhs = decl.name.text;
  if (roots.has(lhs) || suspicious.has(lhs) || decl.initializer === undefined) return;
  const init = unwrapExpr(decl.initializer);
  if (ts.isConditionalExpression(init) && ternaryArmIsBareRoot(init, roots) && !ternaryHasDetectableSkip(init, roots)) {
    suspicious.set(lhs, 'rebind to a ternary whose arm is a bare runner root');
  }
}

/**
 * Is either arm of a `?:` a BARE runner-root identifier that is the FREE (global) runner — not a
 * member base / call / `.skip` chain, AND not a LOCALLY-SHADOWED binding?
 *
 * The shadowing check is the SOUND win the AST enables (the token scanner cannot do it): a runner
 * NAME bound as a function PARAMETER or a local variable in an enclosing scope (`function f(test) {
 * const inner = cond ? test.expression : test }`) is NOT the vitest runner — it is the parameter. The
 * token detector flags such a `test`/`it`/`describe` as a suspicious alias (a real false positive on
 * a parameter named like a runner — common in AST/compiler code). With the parser we resolve it: if
 * the identifier resolves to a parameter/local binding shadowing the runner, it is left CLEAN.
 */
function ternaryArmIsBareRoot(cond: ts.ConditionalExpression, roots: ReadonlySet<string>): boolean {
  const armIsFreeRoot = (arm: ts.Expression): boolean =>
    ts.isIdentifier(arm) && roots.has(arm.text) && !isLocallyShadowed(arm, arm.text);
  return armIsFreeRoot(cond.whenTrue) || armIsFreeRoot(cond.whenFalse);
}

/**
 * Does `name` resolve to a LOCAL binding (a function/arrow/method PARAMETER, or a `const`/`let`/`var`
 * declared in an enclosing block/function) that SHADOWS the global runner, at the position of `node`?
 * Walks PARENT scopes up the tree; the first enclosing function whose parameter list, or any enclosing
 * block whose variable declarations, binds `name` shadows the runner. Sound + conservative: it only
 * ever SUPPRESSES a flag (a shadowed runner name is not the runner), never adds one — so it can only
 * remove false positives, never miss a real aliased runner (an unshadowed free `test`/`it` still flags).
 */
function isLocallyShadowed(node: ts.Node, name: string): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current !== undefined) {
    // A function/arrow/method/constructor PARAMETER named `name` shadows the runner.
    if (
      ts.isFunctionDeclaration(current) ||
      ts.isFunctionExpression(current) ||
      ts.isArrowFunction(current) ||
      ts.isMethodDeclaration(current) ||
      ts.isConstructorDeclaration(current)
    ) {
      for (const param of current.parameters) {
        if (ts.isIdentifier(param.name) && param.name.text === name) return true;
      }
    }
    // A `const`/`let`/`var` named `name` declared in an enclosing block/source-file scope shadows it.
    if (ts.isBlock(current) || ts.isSourceFile(current) || ts.isCaseClause(current) || ts.isDefaultClause(current)) {
      for (const stmt of current.statements) {
        if (ts.isVariableStatement(stmt)) {
          for (const d of stmt.declarationList.declarations) {
            if (ts.isIdentifier(d.name) && d.name.text === name) return true;
          }
        }
      }
    }
    current = current.parent;
  }
  return false;
}

/** Does either arm of a `?:` carry a detectable runner→skip ACCESS chain (`cond ? it : it.skip`)? */
function ternaryHasDetectableSkip(cond: ts.ConditionalExpression, roots: ReadonlySet<string>): boolean {
  return captureSkipChain(cond.whenTrue, roots) !== undefined || captureSkipChain(cond.whenFalse, roots) !== undefined;
}

/**
 * `const skipIt = it.skip` / `= t.skip` (off a RESOLVED root) / `= (it).skip` → record `skipIt` as a
 * DIRECT skip caller bound to that chain. The UNWRAPPED initializer must be a runner→skip ACCESS chain
 * (NOT a call) whose terminal access is a skip / conditional member, rooted at a member of the GROWING
 * `roots` set. `const t = it.each` (no skip terminal) is NOT a capture. Returns true when a NEW capture
 * was recorded (drives the fixpoint).
 */
function collectDirectSkipCapture(
  decl: ts.VariableDeclaration,
  roots: ReadonlySet<string>,
  directSkips: Map<string, string>,
): boolean {
  if (!ts.isIdentifier(decl.name)) return false;
  const lhs = decl.name.text;
  if (directSkips.has(lhs) || decl.initializer === undefined) return false;
  const init = unwrapExpr(decl.initializer);
  // The initializer is an access chain (no trailing call) — a captured `.skip` VALUE.
  if (ts.isCallExpression(init)) return false; // `const t = it.skip()` is a call, not a capture
  const captured = captureSkipChain(init, roots);
  if (captured === undefined) return false;
  directSkips.set(lhs, captured);
  return true;
}

/**
 * Walk an ACCESS chain expression (no trailing call) from its runner root, returning the captured
 * chain token (`it.skip`, `describe.skipIf`, `it["skip"]`) when a skip/conditional member is reached,
 * or `undefined` when the chain has no skip terminal / does not bottom out at a (resolved) runner root.
 */
function captureSkipChain(expr: ts.Expression, roots: ReadonlySet<string>): string | undefined {
  const peeled = peelForCapture(expr, roots);
  if (peeled === undefined) return undefined;
  for (const access of peeled.accesses) {
    if (access.kind === 'skip' || access.kind === 'conditional') return peeled.tokenUpTo(access);
  }
  return undefined;
}

/**
 * `const { skip } = it` / `= t` (off a RESOLVED root) / `= (it)` / `const { todo: gone } = test` →
 * record the destructured local name (`skip` / `gone`) as a BARE skip caller bound to that runner. The
 * UNWRAPPED initializer must be an identifier in the GROWING `roots` set (a literal OR a resolved
 * alias — the codex-R7 `const t = it; const { skip } = t` case). Only members in {@link SKIP_MEMBERS}
 * / {@link CONDITIONAL_MEMBERS} matter; an ordinary destructure (`const { each } = it`) is ignored.
 * Returns true when a NEW bare-skip binding was added (drives the fixpoint).
 */
function collectDestructuredSkip(
  decl: ts.VariableDeclaration,
  roots: ReadonlySet<string>,
  bareSkips: Map<string, string>,
): boolean {
  if (!ts.isObjectBindingPattern(decl.name) || decl.initializer === undefined) return false;
  const init = unwrapExpr(decl.initializer);
  if (!ts.isIdentifier(init) || !roots.has(init.text)) return false;
  let added = false;
  for (const element of decl.name.elements) {
    // `propertyName` is the source member (`todo`) when renamed (`{ todo: gone }`); else `name` is both.
    const member =
      element.propertyName !== undefined && ts.isIdentifier(element.propertyName)
        ? element.propertyName.text
        : ts.isIdentifier(element.name)
          ? element.name.text
          : undefined;
    if (member === undefined) continue;
    if (!SKIP_MEMBERS.has(member) && !CONDITIONAL_MEMBERS.has(member)) continue;
    const local = ts.isIdentifier(element.name) ? element.name.text : member;
    if (bareSkips.has(local)) continue;
    bareSkips.set(local, `${init.text}.${member}`);
    added = true;
  }
  return added;
}

// ---------------------------------------------------------------------------
// Pass 2 — THE CHAIN WALK (a full recursive visit, INTO block bodies).
// ---------------------------------------------------------------------------

/** One access step in a peeled chain — a dotted member, a bracket-string member, or a computed index. */
interface ChainAccess {
  /** What this access RESOLVES TO for skip-detection. */
  readonly kind: 'skip' | 'conditional' | 'passthrough' | 'computed' | 'unrelated';
  /** The dotted member name / bracket-string text / `undefined` for a computed index. */
  readonly member: string | undefined;
  /** The bracket-string display (`["skip"]`) or computed display (`[cond ? "skip" : "only"]`) for the token. */
  readonly bracketDisplay: string | undefined;
  /** The AST node this access corresponds to (for the conditionality ancestor walk). */
  readonly node: ts.PropertyAccessExpression | ts.ElementAccessExpression;
}

/** A peeled access chain rooted at a runner — the root name + the ordered access steps + a token builder. */
interface PeeledChain {
  readonly rootName: string;
  readonly accesses: readonly ChainAccess[];
  /** Build the chain token UP TO (and including) a given access (`it.concurrent.skip`). */
  tokenUpTo(access: ChainAccess): string;
}

/**
 * Peel an expression that is a member/element ACCESS chain down to its runner ROOT, returning the
 * root name + the ordered accesses (root-most first). Calls in the middle of the chain
 * (`it.each([1]).skip`) are TRANSPARENT — the chain continues across them. Returns `undefined` when
 * the expression does not bottom out at a runner root (a literal `it`/`test`/… identifier) OR a
 * namespace `<ns>.<runner>` head — the chain walk's two entry shapes.
 *
 * The root is decided by the caller's binding table at the walk site; here we peel structurally and
 * report the literal-or-aliased root NAME (the walk validates it against the bindings).
 */
function peelAccessChain(
  expr: ts.Expression,
): { rootName: string; rootNode: ts.Identifier; accesses: ChainAccess[] } | undefined {
  const accesses: ChainAccess[] = [];
  let cursor: ts.Expression = expr;
  // Unwind outermost→innermost, collecting each member/element access; step over calls (transparent).
  for (;;) {
    if (ts.isCallExpression(cursor)) {
      cursor = cursor.expression;
      continue;
    }
    if (ts.isPropertyAccessExpression(cursor)) {
      accesses.push(classifyDotted(cursor));
      cursor = cursor.expression;
      continue;
    }
    if (ts.isElementAccessExpression(cursor)) {
      accesses.push(classifyElement(cursor));
      cursor = cursor.expression;
      continue;
    }
    // Peel the TRANSPARENT value wrappers mid-chain too — `(it as typeof it).skip`,
    // `(it satisfies T).skip`, `(<T>it).skip`, `(it).skip`, `it!.skip` — the SAME set the binding
    // collectors unwrap (codex round-8: the wrapper unwrap was at the binding sites but not in the
    // chain walker, so a wrapped runner HEAD escaped). `unwrapExpr` is value-preserving, so the chain
    // root is unchanged.
    const unwrapped = unwrapExpr(cursor);
    if (unwrapped !== cursor) {
      cursor = unwrapped;
      continue;
    }
    break;
  }
  if (!ts.isIdentifier(cursor)) return undefined;
  accesses.reverse(); // root-most first
  return { rootName: cursor.text, rootNode: cursor, accesses };
}

/**
 * Does `name` resolve to a function/method/arrow PARAMETER that SHADOWS the global runner, at `node`'s
 * position? PARAM-ONLY (codex round-8 residual): a runner-named parameter (`function f(test) { …
 * test.skip … }`) is definitively NOT the vitest runner — the parameter shadows it. We do NOT suppress
 * on a `const`/`let` shadow here (unlike the ternary path's {@link isLocallyShadowed}): a local rebind
 * of the runner is RESOLVED by the binding fixpoint, and suppressing it could MISS a real aliased
 * runner. A parameter never aliases the runner, so suppressing it only removes a false positive.
 */
function isShadowedByParameter(node: ts.Node, name: string): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current !== undefined) {
    if (
      ts.isFunctionDeclaration(current) ||
      ts.isFunctionExpression(current) ||
      ts.isArrowFunction(current) ||
      ts.isMethodDeclaration(current) ||
      ts.isConstructorDeclaration(current)
    ) {
      for (const param of current.parameters) {
        if (ts.isIdentifier(param.name) && param.name.text === name) return true;
      }
    }
    current = current.parent;
  }
  return false;
}

/** Classify a `.member` dotted access into a chain step. */
function classifyDotted(node: ts.PropertyAccessExpression): ChainAccess {
  const member = node.name.text;
  return {
    kind: SKIP_MEMBERS.has(member)
      ? 'skip'
      : CONDITIONAL_MEMBERS.has(member)
        ? 'conditional'
        : PASSTHROUGH_MEMBERS.has(member) || isPlausibleModifier(member)
          ? 'passthrough'
          : 'unrelated',
    member,
    bracketDisplay: undefined,
    node,
  };
}

/** Classify a `[…]` element access — a string-literal member (the dotted form in disguise) or a computed index. */
function classifyElement(node: ts.ElementAccessExpression): ChainAccess {
  const arg = node.argumentExpression;
  if (ts.isStringLiteralLike(arg)) {
    const member = arg.text;
    return {
      kind: SKIP_MEMBERS.has(member)
        ? 'skip'
        : CONDITIONAL_MEMBERS.has(member)
          ? 'conditional'
          : PASSTHROUGH_MEMBERS.has(member)
            ? 'passthrough'
            : 'unrelated',
      member,
      bracketDisplay: `["${member}"]`,
      node,
    };
  }
  // A COMPUTED index on a runner root — `it[cond ? "skip" : "only"]` / `it[v]` — can resolve to skip.
  return { kind: 'computed', member: undefined, bracketDisplay: `[${arg.getText().trim()}]`, node };
}

/** A non-skip lowercase chain word, passed through so an UNKNOWN-but-real future modifier never breaks the walk. */
function isPlausibleModifier(member: string): boolean {
  return /^[a-z][A-Za-z0-9]*$/.test(member) && !SKIP_MEMBERS.has(member) && !CONDITIONAL_MEMBERS.has(member);
}

/**
 * Recursively visit EVERY node (INTO describe/test block bodies — the token rewrite's fatal omission)
 * and, at each access/call/identifier, recognise a skip form. The matches accumulate into `out`.
 */
function visitForSkips(node: ts.Node, sourceFile: ts.SourceFile, bindings: RunnerBindings, out: SkipMatch[]): void {
  recognizeAtNode(node, sourceFile, bindings, out);
  ts.forEachChild(node, (child) => visitForSkips(child, sourceFile, bindings, out));
}

/**
 * Recognise a skip at THIS node. We anchor on the OUTERMOST access/call of a chain (so each chain is
 * recognised once, at its top), plus the bare x-prefix alias and the bare aliased-call forms. A
 * de-dupe by (line, token) at the end collapses any overlap from visiting intermediate nodes.
 */
function recognizeAtNode(node: ts.Node, sourceFile: ts.SourceFile, bindings: RunnerBindings, out: SkipMatch[]): void {
  // x-prefix DISABLE alias call — `xit(...)` / `xdescribe(...)`: the callee is a bare runner identifier.
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && X_DISABLE_ALIASES.has(node.expression.text)) {
    push(out, sourceFile, node.expression, 'call', node.expression.text, classifyConditional(node));
    return;
  }

  // A bare ALIASED skip caller — `skipIt(...)` (direct capture) / `skip(...)` (destructured member).
  // The callee is a bare identifier resolved to a captured skip accessor / destructured skip member.
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
    const name = node.expression.text;
    const captured = bindings.directSkips.get(name) ?? bindings.bareSkips.get(name);
    if (captured !== undefined) {
      push(out, sourceFile, node.expression, 'call', captured, classifyConditional(node));
      return;
    }
    // A SUSPICIOUS aliased runner used as a call — `const t = cond ? it : x; t(...)`.
    if (bindings.suspicious.has(name)) {
      push(out, sourceFile, node.expression, 'aliased', name, classifyConditional(node));
      return;
    }
  }

  // An ACCESS chain — recognise it ONLY at the chain's outermost access (its parent is NOT itself a
  // member/element access on it, i.e. the chain does not continue upward), so each chain trips once.
  if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
    if (isOutermostAccess(node)) recognizeChain(node, sourceFile, bindings, out);
  }

  // A BARE skip accessor used as a VALUE (no call) — `const f = COND ? it : it.skip`. The chain walk
  // above already recognises `it.skip` as an outermost access; classifyConditional resolves it to a
  // ternary arm. (Handled uniformly through recognizeChain — no separate path needed.)

  // A SUSPICIOUS aliased runner used as a member/access base — `const t = cond ? it : x; t.skip(...)`.
  if (
    (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) &&
    ts.isIdentifier(node.expression) &&
    bindings.suspicious.has(node.expression.text) &&
    isOutermostAccess(node)
  ) {
    push(out, sourceFile, node.expression, 'aliased', node.expression.text, classifyConditional(node));
  }
}

/** Is `node` the OUTERMOST access of its chain — its parent is not a member/element access whose base is it? */
function isOutermostAccess(node: ts.PropertyAccessExpression | ts.ElementAccessExpression): boolean {
  const parent = node.parent;
  // The chain continues upward if the parent is an access/call ON this node (this node is the base).
  if (ts.isPropertyAccessExpression(parent) && parent.expression === node) return false;
  if (ts.isElementAccessExpression(parent) && parent.expression === node) return false;
  if (ts.isCallExpression(parent) && parent.expression === node) {
    // A call ON this access — the call's parent may continue the chain (`it.each([1]).skip`); the
    // chain is outermost only if the CALL is not itself a base of a further access.
    const callParent = parent.parent;
    if (ts.isPropertyAccessExpression(callParent) && callParent.expression === parent) return false;
    if (ts.isElementAccessExpression(callParent) && callParent.expression === parent) return false;
  }
  return true;
}

/**
 * Recognise a skip in the access chain whose OUTERMOST node is `node`. Peel to the root, validate the
 * root against the binding table (literal/aliased root, or a `<ns>.<runner>` namespace head), then
 * find the FIRST trip (skip / conditional / computed) along the chain and emit it.
 */
function recognizeChain(
  node: ts.PropertyAccessExpression | ts.ElementAccessExpression,
  sourceFile: ts.SourceFile,
  bindings: RunnerBindings,
  out: SkipMatch[],
): void {
  const peeled = peelAccessChain(node);
  if (peeled === undefined) return;

  // A runner-named PARAMETER (`function f(test){ test.skip }`) shadows the global runner — it is NOT
  // the vitest runner, so its `.skip` access is not a real skip (codex round-8 residual). Param-only:
  // a `const`/`let` rebind is resolved by the binding fixpoint, never suppressed here.
  if (isShadowedByParameter(peeled.rootNode, peeled.rootName)) return;

  // Decide the runner root: a literal/aliased root identifier, OR a namespace head `<ns>.<runner>`.
  let rootToken: string;
  let chainAccesses: readonly ChainAccess[];
  if (bindings.roots.has(peeled.rootName)) {
    rootToken = peeled.rootName;
    chainAccesses = peeled.accesses;
  } else if (
    bindings.namespaces.has(peeled.rootName) &&
    peeled.accesses.length >= 1 &&
    peeled.accesses[0]!.member !== undefined &&
    RUNNER_ROOTS.has(peeled.accesses[0]!.member)
  ) {
    // `v.it.skip` — the namespace `v` then the runner member `it`; the runner head is `v.it`.
    rootToken = `${peeled.rootName}.${peeled.accesses[0]!.member}`;
    chainAccesses = peeled.accesses.slice(1);
  } else {
    return;
  }

  // Find the FIRST trip along the chain after the root.
  let token = rootToken;
  for (const access of chainAccesses) {
    token += access.bracketDisplay ?? `.${access.member ?? ''}`;
    if (access.kind === 'skip') {
      const form: SkipForm = followedByCall(access.node) ? 'call' : 'alias';
      push(out, sourceFile, node, form, token, classifyConditional(access.node));
      return;
    }
    if (access.kind === 'conditional') {
      push(out, sourceFile, node, 'conditional', token, classifyConditional(access.node));
      return;
    }
    if (access.kind === 'computed') {
      push(out, sourceFile, node, 'computed', token, classifyConditional(access.node));
      return;
    }
    if (access.kind === 'unrelated') return; // an unrelated member ends the runner chain (`it.toString`)
    // passthrough → continue
  }
}

/** Is the access `node` immediately INVOKED — `it.skip(...)` (a call) vs a bare `it.skip` value? */
function followedByCall(node: ts.PropertyAccessExpression | ts.ElementAccessExpression): boolean {
  const parent = node.parent;
  return ts.isCallExpression(parent) && parent.expression === node;
}

// ---------------------------------------------------------------------------
// Pass 3 — CONDITIONALITY (the ancestor walk the token level cannot do).
// ---------------------------------------------------------------------------

/**
 * The COMPILE-TIME truthiness of a condition expression WHEN it is a constant — `true`/`false`, a
 * numeric / string / bigint literal, `null`, the `undefined`/`NaN`/`Infinity` identifiers, a regex
 * (always truthy), a `!`/unary-`±`/`void` over a constant, and a short-circuiting `&&`/`||` of
 * constants. Returns `true`/`false` for a DECIDED constant, or `undefined` when the expression
 * references a RUNTIME value (an ordinary identifier, a call, a comparison, …). PARSER-DECIDABLE — no
 * evaluation, no checker, no Program.
 *
 * THE SOUNDNESS FLOOR (codex round-7). A guard is a genuine runtime gate ONLY when its condition can
 * vary at runtime; a COMPILE-TIME-CONSTANT condition (`if (true) {…}`, `skipIf(true)`, `true ? … : …`)
 * is VACUOUS — the branch is taken (or not) unconditionally, so the skip is a placeholder dressed as a
 * gate. A real capability gate (`!FFMPEG`, `process.platform === 'win32'`, `!canUseSAB`) references a
 * runtime value → `undefined` here → NEVER folded. The function ONLY ever returns a decided boolean
 * for a literal-constant expression, so it can never mis-judge a real gate as vacuous (no false
 * "unconditional"); the residual is the reverse (a contrived all-literal comparison like `1 === 1` is
 * left as `undefined` → treated as a gate), which is harmless and far rarer than `if (true)`.
 */
function constTruthiness(expr: ts.Expression): boolean | undefined {
  const e = unwrapExpr(expr);
  if (e.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (e.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (e.kind === ts.SyntaxKind.NullKeyword) return false;
  if (ts.isNumericLiteral(e)) return Number(e.text) !== 0 && !Number.isNaN(Number(e.text));
  if (ts.isBigIntLiteral(e)) return !/^0+n$/.test(e.text); // "0n" → false, any non-zero bigint → true
  if (ts.isStringLiteralLike(e)) return e.text.length > 0;
  if (ts.isRegularExpressionLiteral(e)) return true; // a RegExp object is always truthy
  if (ts.isIdentifier(e)) {
    if (e.text === 'undefined' || e.text === 'NaN') return false;
    if (e.text === 'Infinity') return true;
    return undefined; // any other identifier is a runtime value — a genuine gate
  }
  if (ts.isVoidExpression(e)) return false; // `void <anything>` evaluates to `undefined` → falsy
  if (ts.isPrefixUnaryExpression(e)) {
    const inner = constTruthiness(e.operand);
    if (inner === undefined) return undefined;
    if (e.operator === ts.SyntaxKind.ExclamationToken) return !inner;
    // Unary ±: the truthiness of `-x`/`+x` matches that of `x` (only ±0 is falsy, already false).
    if (e.operator === ts.SyntaxKind.MinusToken || e.operator === ts.SyntaxKind.PlusToken) return inner;
    return undefined;
  }
  // `Boolean(<constant>)` — the explicit cast (codex round-8: `if (Boolean(1))` was not folded).
  if (
    ts.isCallExpression(e) &&
    ts.isIdentifier(e.expression) &&
    e.expression.text === 'Boolean' &&
    e.arguments.length === 1
  ) {
    return constTruthiness(e.arguments[0]!);
  }
  if (ts.isBinaryExpression(e)) {
    const op = e.operatorToken.kind;
    if (op === ts.SyntaxKind.AmpersandAmpersandToken) {
      const l = constTruthiness(e.left);
      if (l === false) return false; // `false && _` → false (short-circuit)
      if (l === undefined) return undefined;
      return constTruthiness(e.right); // `true && right` → truthiness of right
    }
    if (op === ts.SyntaxKind.BarBarToken) {
      const l = constTruthiness(e.left);
      if (l === true) return true; // `true || _` → true (short-circuit)
      if (l === undefined) return undefined;
      return constTruthiness(e.right); // `false || right` → truthiness of right
    }
    // A comparison of two CONSTANT literals folds to a constant (codex round-8: `if (1 === 1)` was not
    // folded). Only fires when BOTH sides are decidable literal VALUES — a runtime operand → undefined.
    return constComparison(op, e.left, e.right);
  }
  return undefined;
}

/** A decidable literal VALUE of a constant expression (number/string/boolean/null), else undefined. */
function constValue(expr: ts.Expression): { v: number | string | boolean | null } | undefined {
  const e = unwrapExpr(expr);
  if (e.kind === ts.SyntaxKind.TrueKeyword) return { v: true };
  if (e.kind === ts.SyntaxKind.FalseKeyword) return { v: false };
  if (e.kind === ts.SyntaxKind.NullKeyword) return { v: null };
  if (ts.isNumericLiteral(e)) return { v: Number(e.text) };
  if (ts.isStringLiteralLike(e)) return { v: e.text };
  if (ts.isPrefixUnaryExpression(e)) {
    const inner = constValue(e.operand);
    if (inner === undefined) return undefined;
    if (e.operator === ts.SyntaxKind.MinusToken && typeof inner.v === 'number') return { v: -inner.v };
    if (e.operator === ts.SyntaxKind.PlusToken && typeof inner.v === 'number') return { v: +inner.v };
    if (e.operator === ts.SyntaxKind.ExclamationToken) return { v: !inner.v };
  }
  return undefined;
}

/**
 * Fold a comparison of two CONSTANT operands (`1 === 1`, `2 < 3`, `"a" !== "b"`) to its boolean value,
 * or undefined when either side is not a decidable literal (a runtime operand). Strict `===`/`!==` and
 * the orderings only — loose `==`/`!=` is left runtime (never folded) so the eqeqeq discipline holds and
 * no coercion surprise can mis-fold. Sound: it only ever decides a genuinely-constant comparison.
 */
function constComparison(op: ts.SyntaxKind, left: ts.Expression, right: ts.Expression): boolean | undefined {
  const l = constValue(left);
  const r = constValue(right);
  if (l === undefined || r === undefined) return undefined;
  switch (op) {
    case ts.SyntaxKind.EqualsEqualsEqualsToken:
      return l.v === r.v;
    case ts.SyntaxKind.ExclamationEqualsEqualsToken:
      return l.v !== r.v;
    case ts.SyntaxKind.LessThanToken:
      return (l.v as number | string) < (r.v as number | string);
    case ts.SyntaxKind.GreaterThanToken:
      return (l.v as number | string) > (r.v as number | string);
    case ts.SyntaxKind.LessThanEqualsToken:
      return (l.v as number | string) <= (r.v as number | string);
    case ts.SyntaxKind.GreaterThanEqualsToken:
      return (l.v as number | string) >= (r.v as number | string);
    default:
      return undefined;
  }
}

/**
 * Classify the CONDITIONALITY of a detected skip from `node` (the skip access or its call):
 *  - `'skipIf'` / `'runIf'` — the access member IS the runtime gate (with a RUNTIME-valued condition);
 *  - `'ternary'` — the skip is (transitively) a `?:` arm whose CONDITION is runtime — `cond ? it : it.skip`;
 *  - `'enclosing-if'` — an ANCESTOR is an `if (<runtime cond>) { … }` whose THEN/ELSE branch holds the
 *    skip (the structural proof the token CANNOT see — walking PARENT pointers up the tree);
 *  - `'unconditional'` — none of the above (a placeholder, always reached) — INCLUDING a guard whose
 *    condition is a COMPILE-TIME CONSTANT (`if (true)`, `skipIf(true)`, `true ? …`): vacuous, not a gate.
 *
 * The check ORDER matters: a `.skipIf`/`.runIf` member is conditional by its own form; a ternary arm
 * is next; the enclosing-`if` ancestor walk is last (the broadest). The first that holds wins. A
 * VACUOUS (constant-condition) form at any of these does NOT classify conditional — it falls through to
 * `unconditional`, so a placeholder cannot launder itself behind `if (true)` (codex round-7).
 */
function classifyConditional(node: ts.Node): SkipConditionality {
  // 1) The access member itself a conditional member (`it.skipIf(<runtime>)`) — vacuous arg folds away.
  const memberCond = conditionalMemberOf(node);
  if (memberCond !== undefined) return memberCond;

  // 2) Vitest's SKIP-WITH-CONDITION first-arg form — `test.skip(<cond>, '<title>', fn)`. A `.skip(`
  //    call whose FIRST argument is NOT a string-literal title is a RUNTIME condition (the runner
  //    skips iff it holds), so the gate is IN the call. We map it onto `skipIf` (the same runtime
  //    semantics) — its conditionality is structural, not a placeholder. A first arg that IS a
  //    string literal is the ordinary UNCONDITIONAL title form (`it.skip('later', fn)`).
  if (isSkipWithConditionArg(node)) return 'skipIf';

  // 3) A ternary arm anywhere up the chain — the skip accessor is a `whenTrue`/`whenFalse` of a `?:`.
  if (isInTernaryArm(node)) return 'ternary';

  // 4) An enclosing `if (<cond>) { … }` — the ancestor walk.
  if (isInsideIfBranch(node)) return 'enclosing-if';

  return 'unconditional';
}

/**
 * Collect EVERY guard CONDITION expression governing the skip at `node` (the skip access or its call):
 *  - the `.skipIf(<cond>)` / `.runIf(<cond>)` member-call argument;
 *  - a `.skip(<cond>, …)` skip-with-condition argument;
 *  - every enclosing `?:` condition on the value spine (`cond ? it : it.skip`);
 *  - every enclosing `if (<cond>) { … }` condition up to the function boundary.
 *
 * This is the syntactic counterpart of {@link classifyConditional} that returns the guard NODES rather
 * than a classification — the CAPABILITY-GATE LINKER (`@czap/audit`'s capability-link oracle) resolves
 * the symbols of these expressions through the checker to PROVE the skip's guard derives from its
 * declared capability's probe (codex round-8 #1b: conditional ≠ gated-by-the-declared-capability).
 * Returns `[]` for an unconditional skip (no guard) — exported for the host oracle (parser-only; the
 * symbol resolution happens in the oracle's `ts.Program`).
 */
export function guardExpressionsOf(node: ts.Node): readonly ts.Expression[] {
  const guards: ts.Expression[] = [];
  // `.skipIf`/`.runIf` member call — its first argument is the runtime gate.
  const condCall = conditionalMemberCall(node);
  if (condCall?.arguments[0] !== undefined) guards.push(condCall.arguments[0]);
  // `.skip(<cond>, …)` skip-with-condition — the non-title first argument.
  if (isSkipWithConditionArg(node)) {
    const call = ts.isCallExpression(node) ? node : ts.isCallExpression(node.parent) ? node.parent : undefined;
    if (call?.arguments[0] !== undefined) guards.push(call.arguments[0]);
  }
  // Ancestor walk: every enclosing ternary condition (on the value spine) + every enclosing-if condition.
  let child: ts.Node = node;
  let parent: ts.Node | undefined = node.parent;
  while (parent !== undefined) {
    if (
      ts.isFunctionDeclaration(parent) ||
      ts.isFunctionExpression(parent) ||
      ts.isArrowFunction(parent) ||
      ts.isMethodDeclaration(parent)
    ) {
      // A ternary arm crosses into a callback only as the SAME value (the skip accessor); an enclosing
      // `if` does not govern a nested function body. Stop the `if` walk at the function boundary, but a
      // ternary whose arm IS this function-valued expression still counts (handled by the spine check).
      if (!(ts.isArrowFunction(parent) || ts.isFunctionExpression(parent))) break;
    }
    if (ts.isConditionalExpression(parent) && (parent.whenTrue === child || parent.whenFalse === child)) {
      guards.push(parent.condition);
    }
    if (ts.isIfStatement(parent) && (parent.thenStatement === child || parent.elseStatement === child)) {
      guards.push(parent.expression);
    }
    child = parent;
    parent = parent.parent;
  }
  return guards;
}

/** The `.skipIf(<cond>)` / `.runIf(<cond>)` CALL governing the skip at `node`, or undefined. */
function conditionalMemberCall(node: ts.Node): ts.CallExpression | undefined {
  let expr: ts.Node | undefined = ts.isCallExpression(node) ? node.expression : node;
  while (expr !== undefined) {
    const isCondMember =
      (ts.isPropertyAccessExpression(expr) && (expr.name.text === 'skipIf' || expr.name.text === 'runIf')) ||
      (ts.isElementAccessExpression(expr) &&
        ts.isStringLiteralLike(expr.argumentExpression) &&
        (expr.argumentExpression.text === 'skipIf' || expr.argumentExpression.text === 'runIf'));
    if (isCondMember) {
      const call = expr.parent;
      return ts.isCallExpression(call) && call.expression === expr ? call : undefined;
    }
    if (ts.isPropertyAccessExpression(expr) || ts.isElementAccessExpression(expr) || ts.isCallExpression(expr)) {
      expr = expr.expression;
      continue;
    }
    break;
  }
  return undefined;
}

/**
 * Is `node` (or its wrapping call) a `.skip(<cond>, …)` whose FIRST argument is a RUNTIME condition
 * rather than a string-literal title — Vitest's `it.skip(condition, name, fn)` skip-with-condition?
 * A non-string first arg (`!built`, `process.platform === 'win32'`) makes the skip CONDITIONAL.
 */
function isSkipWithConditionArg(node: ts.Node): boolean {
  // Find the CallExpression invoking a `.skip` member. `node` is the call OR the access it wraps.
  const call = ts.isCallExpression(node)
    ? node
    : ts.isCallExpression(node.parent) && node.parent.expression === node
      ? node.parent
      : undefined;
  if (call === undefined) return false;
  const callee = call.expression;
  const isSkipMember =
    (ts.isPropertyAccessExpression(callee) && callee.name.text === 'skip') ||
    (ts.isElementAccessExpression(callee) &&
      ts.isStringLiteralLike(callee.argumentExpression) &&
      callee.argumentExpression.text === 'skip');
  if (!isSkipMember) return false;
  const first = call.arguments[0];
  // A non-string-literal first argument is the runtime condition (`!built`); a string is the title.
  // A COMPILE-TIME-CONSTANT first arg (`it.skip(true, …)`) is VACUOUS — not a runtime gate (codex R7).
  return first !== undefined && !ts.isStringLiteralLike(first) && constTruthiness(first) === undefined;
}

/**
 * If `node`'s access chain trips on a `.skipIf`/`.runIf` member with a RUNTIME-valued condition, return
 * that classification; else undefined. A `.skipIf`/`.runIf` whose argument is a COMPILE-TIME CONSTANT
 * (`it.skipIf(true)`) is VACUOUS — not a runtime gate — and returns undefined so it folds to
 * `unconditional` (codex round-7). The `member` access node is the callee of the `.skipIf(<arg>)` call,
 * so the call (and its argument) is the member access's parent.
 */
function conditionalMemberOf(node: ts.Node): SkipConditionality | undefined {
  // `node` is either the skip access or the call wrapping it. Inspect the access chain it belongs to.
  let expr: ts.Node | undefined = ts.isCallExpression(node) ? node.expression : node;
  // Walk down the access chain for a conditional member (the chain may be `it.skipIf(c)` directly).
  while (expr !== undefined) {
    if (ts.isPropertyAccessExpression(expr)) {
      if (expr.name.text === 'skipIf') return conditionalMemberKind(expr, 'skipIf');
      if (expr.name.text === 'runIf') return conditionalMemberKind(expr, 'runIf');
      expr = expr.expression;
      continue;
    }
    if (ts.isElementAccessExpression(expr)) {
      if (ts.isStringLiteralLike(expr.argumentExpression)) {
        if (expr.argumentExpression.text === 'skipIf') return conditionalMemberKind(expr, 'skipIf');
        if (expr.argumentExpression.text === 'runIf') return conditionalMemberKind(expr, 'runIf');
      }
      expr = expr.expression;
      continue;
    }
    if (ts.isCallExpression(expr)) {
      expr = expr.expression;
      continue;
    }
    break;
  }
  return undefined;
}

/**
 * The conditional-member kind for a `.skipIf`/`.runIf` access — `kind` unless the member's call passes a
 * COMPILE-TIME-CONSTANT condition, in which case the gate is VACUOUS (`undefined` → folds to
 * `unconditional`). The call invoking the member is the access node's parent (`<member>(<arg>)`).
 */
function conditionalMemberKind(member: ts.Node, kind: 'skipIf' | 'runIf'): SkipConditionality | undefined {
  const call = member.parent;
  if (ts.isCallExpression(call) && call.expression === member) {
    const first = call.arguments[0];
    if (first !== undefined && constTruthiness(first) !== undefined) return undefined; // vacuous condition
  }
  return kind;
}

/**
 * Is `node` (transitively, through access/call parents) an ARM of a conditional `?:` whose CONDITION is
 * a runtime value? A ternary with a COMPILE-TIME-CONSTANT condition (`true ? it.skip : it`) is VACUOUS —
 * one arm is dead, the other unconditional — so it is NOT a runtime gate (codex round-7) and is left for
 * the unconditional fall-through.
 */
function isInTernaryArm(node: ts.Node): boolean {
  let current: ts.Node = node;
  let parent: ts.Node | undefined = node.parent;
  while (parent !== undefined) {
    if (ts.isConditionalExpression(parent) && (parent.whenTrue === current || parent.whenFalse === current)) {
      // A RUNTIME-conditioned ternary arm is a gate; a VACUOUS (constant-condition) one is not — keep
      // ascending past it (an OUTER runtime ternary/if could still guard the skip).
      if (constTruthiness(parent.condition) === undefined) return true;
    }
    // Only ascend through the access/call/paren spine that keeps the skip as the SAME value; stop at
    // a statement/argument boundary (a ternary in the test BODY is unrelated to the skip accessor).
    if (
      ts.isPropertyAccessExpression(parent) ||
      ts.isElementAccessExpression(parent) ||
      ts.isCallExpression(parent) ||
      ts.isParenthesizedExpression(parent) ||
      ts.isNonNullExpression(parent) ||
      ts.isConditionalExpression(parent)
    ) {
      current = parent;
      parent = parent.parent;
      continue;
    }
    break;
  }
  return false;
}

/**
 * Is `node` inside the THEN or ELSE branch of an `if (<runtime cond>) { … }` ancestor? Walk PARENT
 * pointers up the tree; if any ancestor is an `IfStatement` whose CONDITION is a runtime value and
 * `node` lies within its `thenStatement` or `elseStatement` (NOT the condition expression itself), the
 * skip is guarded. An `if (<compile-time constant>) { … }` (`if (true) {…}`) is VACUOUS — the branch is
 * taken (or not) unconditionally, so it is NOT a gate (codex round-7: the demonstrated laundering of a
 * placeholder behind `if (true)`); we keep ascending past it for an OUTER real guard. We stop at a
 * function boundary (a skip inside a nested function is governed by that function's own control flow,
 * not the outer `if` — a conservative, sound choice that never over-claims conditionality).
 */
function isInsideIfBranch(node: ts.Node): boolean {
  let child: ts.Node = node;
  let parent: ts.Node | undefined = node.parent;
  while (parent !== undefined) {
    if (ts.isIfStatement(parent)) {
      // Guarded iff the child is in the THEN or ELSE branch (not the condition) AND the condition is a
      // RUNTIME value. A vacuous constant condition is not a gate — fall through to keep ascending.
      if (
        (parent.thenStatement === child || parent.elseStatement === child) &&
        constTruthiness(parent.expression) === undefined
      ) {
        return true;
      }
      // `child` may be a deeper descendant — but our walk ascends one level at a time, so by the time
      // we reach the IfStatement, `child` is exactly its direct branch statement (thenStatement is a
      // Block in the canonical `if (c) { … }`). If `child` is the condition, it's not guarded.
      if (parent.expression === child) {
        // The skip is INSIDE the condition expression — that is the gate test itself, not a guarded
        // body; keep ascending (an outer `if` could still guard the whole thing).
        child = parent;
        parent = parent.parent;
        continue;
      }
    }
    // Stop at a function/method boundary — the outer `if` does not govern a nested closure's body.
    if (
      ts.isFunctionDeclaration(parent) ||
      ts.isFunctionExpression(parent) ||
      ts.isArrowFunction(parent) ||
      ts.isMethodDeclaration(parent)
    ) {
      return false;
    }
    child = parent;
    parent = parent.parent;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Emit + de-dupe.
// ---------------------------------------------------------------------------

/** Push one match, computing its 1-based line from the node's start position. */
function push(
  out: SkipMatch[],
  sourceFile: ts.SourceFile,
  lineNode: ts.Node,
  form: SkipForm,
  token: string,
  conditional: SkipConditionality,
): void {
  const line = sourceFile.getLineAndCharacterOfPosition(lineNode.getStart(sourceFile)).line + 1;
  out.push({ line, form, token, conditional });
}

/**
 * De-duplicate by (line, token), keeping the STRONGEST form (call > conditional > computed > aliased
 * > alias). When two matches collide, the one with a CONDITIONAL classification (not `unconditional`)
 * wins the conditionality (a structural gate beats a default), so the F2 partition sees the guard.
 * Sorted by line then token for a stable, reviewable order — identical to the token detector's order.
 */
function dedupe(matches: readonly SkipMatch[]): readonly SkipMatch[] {
  const rank: Record<SkipForm, number> = { call: 5, conditional: 4, computed: 3, aliased: 2, alias: 1 };
  const byKey = new Map<string, SkipMatch>();
  for (const m of matches) {
    const key = `${m.line}::${m.token}`;
    const existing = byKey.get(key);
    if (existing === undefined) {
      byKey.set(key, m);
      continue;
    }
    const strongerForm = rank[m.form] > rank[existing.form];
    const moreConditional = existing.conditional === 'unconditional' && m.conditional !== 'unconditional';
    if (strongerForm) {
      byKey.set(key, { ...m, conditional: moreConditional ? m.conditional : (existing.conditional ?? m.conditional) });
    } else if (moreConditional) {
      byKey.set(key, { ...existing, conditional: m.conditional });
    }
  }
  return [...byKey.values()].sort((a, b) => a.line - b.line || (a.token < b.token ? -1 : 1));
}

// ---------------------------------------------------------------------------
// PeeledChain token helper (used by captureSkipChain).
// ---------------------------------------------------------------------------

/** Build the full chain — root + the access display up to (and including) `access`. */
function buildTokenUpTo(rootName: string, accesses: readonly ChainAccess[], access: ChainAccess): string {
  let token = rootName;
  for (const a of accesses) {
    token += a.bracketDisplay ?? `.${a.member ?? ''}`;
    if (a === access) break;
  }
  return token;
}

/**
 * Re-export of {@link peelAccessChain} with the {@link PeeledChain} token builder, for capture.
 * Validates the chain's root against the RESOLVED `roots` set (a literal root OR a resolved alias —
 * so `const skipIt = t.skip` captures off the `const t = it` alias), not just the literal set.
 */
function peelForCapture(expr: ts.Expression, roots: ReadonlySet<string>): PeeledChain | undefined {
  const peeled = peelAccessChain(expr);
  if (peeled === undefined || !roots.has(peeled.rootName)) return undefined;
  return {
    rootName: peeled.rootName,
    accesses: peeled.accesses,
    tokenUpTo: (access: ChainAccess): string => buildTokenUpTo(peeled.rootName, peeled.accesses, access),
  };
}
