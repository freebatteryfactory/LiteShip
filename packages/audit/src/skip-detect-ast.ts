/**
 * THE SOUND, AST-BASED SKIP DETECTOR — the cure that ends the token-scanner whack-a-mole.
 *
 * The token {@link detectSkips} (`@czap/gauntlet`'s dependency-free fallback) is a char/token
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
 * WHAT IT RETURNS. The SAME {@link SkipMatch} shape the token detector returns (so it is a drop-in
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
 * `conditional` classification. Drop-in for the token {@link detectSkips} (same {@link SkipMatch}
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
 * Resolve every runner ALIAS the file's SYNTAX decides, as a fixpoint. Walks ALL declaration
 * statements (top-level AND nested in blocks/functions — a rebind can live inside a closure), then
 * closes the transitive `const a = it; const b = a` chain one hop per pass until no new root appears.
 *
 * The decidable forms (each PROVEN against the R4/R5/R6 corpus):
 *  - `import { it as spec } from "vitest"` → `spec` is a root (line-agnostic: the AST has no
 *    multi-line specifier problem);
 *  - `import * as v from "vitest"` → `v` is a runner namespace (`v.it.skip` trips);
 *  - `const t = it` / `let d = describe` (incl. `const t: typeof it = it`) → `t`/`d` are roots,
 *    transitively to a fixpoint, AND the ASI form `const t = it⏎t.skip` (the AST sees `const t = it`
 *    as one statement regardless of the missing semicolon);
 *  - `const skipIt = it.skip` → `skipIt` is a DIRECT skip caller (the accessor captured as a value);
 *  - `const { skip } = it` / `const { todo: gone } = test` → `skip`/`gone` are bare skip callers;
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

  // Pass A (non-transitive): imports, destructures, direct-skip captures, suspicious ternaries.
  for (const imp of imports) collectImport(imp, roots, namespaces);
  for (const decl of varDecls) {
    collectDestructuredSkip(decl, bareSkips);
    collectDirectSkipCapture(decl, directSkips);
  }

  // Pass B (transitive fixpoint): plain `const t = <root>` rebinds, one hop per pass, until settled.
  let changed = true;
  let guard = 0;
  while (changed && guard <= varDecls.length) {
    changed = false;
    guard++;
    for (const decl of varDecls) {
      if (collectRootRebind(decl, roots, suspicious)) changed = true;
    }
  }

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
 * `const t = it` / `let d = describe` (incl. `const t: typeof it = it`) → add the LHS as a root when
 * the initializer is EXACTLY a known root identifier. A ternary-arm runner (`const t = cond ? it : x`)
 * is recorded SUSPICIOUS. Returns true when a NEW root was added (drives the transitive fixpoint).
 */
function collectRootRebind(decl: ts.VariableDeclaration, roots: Set<string>, suspicious: Map<string, string>): boolean {
  if (!ts.isIdentifier(decl.name)) return false;
  const lhs = decl.name.text;
  if (roots.has(lhs)) return false;
  const init = decl.initializer;
  if (init === undefined) return false;
  // Clean alias: the initializer is exactly a known/resolved root identifier (the type annotation,
  // if any, is `decl.type` — a SEPARATE node, so it never contaminates the initializer check).
  if (ts.isIdentifier(init) && roots.has(init.text)) {
    roots.add(lhs);
    return true;
  }
  // Suspicious: a ternary whose arm is a BARE runner root — `const t = cond ? it : x`. Narrow on
  // purpose (the runner names are common ordinary identifiers). We do NOT flag when the OTHER arm
  // already carries a detectable skip chain (`cond ? it : it.skip`): that arm is recognised by the
  // chain walk at THIS declaration line (form `alias`), so flagging the alias too would double-report
  // AND mis-classify it `unconditional` at every later call — exactly the false positive that broke
  // the real-repo `const renderIt = FFMPEG ? it : it.skip` sanctioned sites.
  if (
    ts.isConditionalExpression(init) &&
    !suspicious.has(lhs) &&
    ternaryArmIsBareRoot(init, roots) &&
    !ternaryHasDetectableSkip(init)
  ) {
    suspicious.set(lhs, 'rebind to a ternary whose arm is a bare runner root');
  }
  return false;
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
function ternaryHasDetectableSkip(cond: ts.ConditionalExpression): boolean {
  return captureSkipChain(cond.whenTrue) !== undefined || captureSkipChain(cond.whenFalse) !== undefined;
}

/**
 * `const skipIt = it.skip` → record `skipIt` as a DIRECT skip caller bound to that chain. The
 * initializer must be a runner→skip ACCESS chain (NOT a call) whose terminal access is a skip /
 * conditional member. `const t = it.each` (no skip terminal) is NOT a capture.
 */
function collectDirectSkipCapture(decl: ts.VariableDeclaration, directSkips: Map<string, string>): void {
  if (!ts.isIdentifier(decl.name)) return;
  const init = decl.initializer;
  if (init === undefined) return;
  // The initializer is an access chain (no trailing call) — a captured `.skip` VALUE.
  if (ts.isCallExpression(init)) return; // `const t = it.skip()` is a call, not a capture
  const captured = captureSkipChain(init);
  if (captured !== undefined) directSkips.set(decl.name.text, captured);
}

/**
 * Walk an ACCESS chain expression (no trailing call) from its runner root, returning the captured
 * chain token (`it.skip`, `describe.skipIf`, `it["skip"]`) when a skip/conditional member is reached,
 * or `undefined` when the chain has no skip terminal / does not bottom out at a runner root.
 */
function captureSkipChain(expr: ts.Expression): string | undefined {
  const peeled = peelForCapture(expr);
  if (peeled === undefined) return undefined;
  for (const access of peeled.accesses) {
    if (access.kind === 'skip' || access.kind === 'conditional') return peeled.tokenUpTo(access);
  }
  return undefined;
}

/**
 * `const { skip } = it` / `const { todo: gone } = test` → record the destructured local name
 * (`skip` / `gone`) as a BARE skip caller bound to that runner. Only members in {@link SKIP_MEMBERS}
 * / {@link CONDITIONAL_MEMBERS} matter; an ordinary destructure (`const { each } = it`) is ignored.
 */
function collectDestructuredSkip(decl: ts.VariableDeclaration, bareSkips: Map<string, string>): void {
  if (!ts.isObjectBindingPattern(decl.name)) return;
  const init = decl.initializer;
  if (init === undefined || !ts.isIdentifier(init) || !RUNNER_ROOTS.has(init.text)) return;
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
    bareSkips.set(local, `${init.text}.${member}`);
  }
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
function peelAccessChain(expr: ts.Expression): { rootName: string; accesses: ChainAccess[] } | undefined {
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
    if (ts.isNonNullExpression(cursor) || ts.isParenthesizedExpression(cursor)) {
      cursor = cursor.expression;
      continue;
    }
    break;
  }
  if (!ts.isIdentifier(cursor)) return undefined;
  accesses.reverse(); // root-most first
  return { rootName: cursor.text, accesses };
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
 * Classify the CONDITIONALITY of a detected skip from `node` (the skip access or its call):
 *  - `'skipIf'` / `'runIf'` — the access member IS the runtime gate;
 *  - `'ternary'` — the skip is (transitively) a `?:` arm — `cond ? it : it.skip`;
 *  - `'enclosing-if'` — an ANCESTOR is an `if (<cond>) { … }` whose THEN/ELSE branch holds the skip
 *    (the structural proof the token CANNOT see — walking PARENT pointers up the tree);
 *  - `'unconditional'` — none of the above (a placeholder, always reached).
 *
 * The check ORDER matters: a `.skipIf`/`.runIf` member is conditional by its own form; a ternary arm
 * is next; the enclosing-`if` ancestor walk is last (the broadest). The first that holds wins.
 */
function classifyConditional(node: ts.Node): SkipConditionality {
  // 1) The access member itself a conditional member (`it.skipIf(…)`)?
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
  return first !== undefined && !ts.isStringLiteralLike(first);
}

/** If `node`'s access chain trips on a `.skipIf`/`.runIf` member, return that classification; else undefined. */
function conditionalMemberOf(node: ts.Node): SkipConditionality | undefined {
  // `node` is either the skip access or the call wrapping it. Inspect the access chain it belongs to.
  let expr: ts.Node | undefined = ts.isCallExpression(node) ? node.expression : node;
  // Walk down the access chain for a conditional member (the chain may be `it.skipIf(c)` directly).
  while (expr !== undefined) {
    if (ts.isPropertyAccessExpression(expr)) {
      if (expr.name.text === 'skipIf') return 'skipIf';
      if (expr.name.text === 'runIf') return 'runIf';
      expr = expr.expression;
      continue;
    }
    if (ts.isElementAccessExpression(expr)) {
      if (ts.isStringLiteralLike(expr.argumentExpression)) {
        if (expr.argumentExpression.text === 'skipIf') return 'skipIf';
        if (expr.argumentExpression.text === 'runIf') return 'runIf';
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

/** Is `node` (transitively, through access/call parents) an ARM of a conditional `?:` expression? */
function isInTernaryArm(node: ts.Node): boolean {
  let current: ts.Node = node;
  let parent: ts.Node | undefined = node.parent;
  while (parent !== undefined) {
    if (ts.isConditionalExpression(parent) && (parent.whenTrue === current || parent.whenFalse === current)) {
      return true;
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
 * Is `node` inside the THEN or ELSE branch of an `if (<cond>) { … }` ancestor? Walk PARENT pointers
 * up the tree; if any ancestor is an `IfStatement` and `node` lies within its `thenStatement` or
 * `elseStatement` (NOT the condition expression itself), the skip is guarded. We stop at a function
 * boundary (a skip inside a nested function is governed by that function's own control flow, not the
 * outer `if` — a conservative, sound choice that never over-claims conditionality).
 */
function isInsideIfBranch(node: ts.Node): boolean {
  let child: ts.Node = node;
  let parent: ts.Node | undefined = node.parent;
  while (parent !== undefined) {
    if (ts.isIfStatement(parent)) {
      // Guarded iff the child is in the THEN or ELSE branch (not the condition).
      if (parent.thenStatement === child || parent.elseStatement === child) return true;
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

/** Re-export of {@link peelAccessChain} with the {@link PeeledChain} token builder, for capture. */
function peelForCapture(expr: ts.Expression): PeeledChain | undefined {
  const peeled = peelAccessChain(expr);
  if (peeled === undefined || !RUNNER_ROOTS.has(peeled.rootName)) return undefined;
  return {
    rootName: peeled.rootName,
    accesses: peeled.accesses,
    tokenUpTo: (access: ChainAccess): string => buildTokenUpTo(peeled.rootName, peeled.accesses, access),
  };
}
