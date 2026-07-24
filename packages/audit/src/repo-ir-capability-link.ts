/**
 * THE CAPABILITY-LINK ORACLE — the dataflow proof that a sanctioned capability-gated skip's GUARD
 * DERIVES FROM its declared capability's probe (codex round-8, #1b). Sibling of the taint oracle:
 * it builds a type-directed `ts.Program` + checker over the canonical capability symbol-table modules
 * and the sanctioned skip files, and for each skip resolves its guard condition's symbols to prove the
 * guard reaches the capability it claims. It emits GENERIC {@link CapabilityLinkFacts} and stays
 * LiteShip-AGNOSTIC: the capability-module SET, the capability id set, and the sanctioned sites are
 * INJECTED ({@link CapabilityLinkOptions}) — `@liteship/audit` names no LiteShip capability.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE LINKER MODEL (why this is sound, and self-assembling — no hand registry).
 *
 * A capability is DEFINED ONCE as an EXPORT of a canonical symbol-table module, the export NAME being
 * the capability id (camelCase ↔ kebab: `wasmAbsent` ↔ `wasm-absent`). The repo's own probe code is
 * the registry; add a capability ⇒ add an export. The oracle:
 *
 *   1. SYMBOL TABLE. Reads each capability module's exports whose kebab name is a known capability id
 *      (so a non-capability export like `FFMPEG_RENDER_CAPABLE` is not mistaken for one). For each, it
 *      computes the export's SYMBOL CLOSURE — every symbol reachable from the export's initializer
 *      through `const`/`let` initializers, de-aliasing imports (so `wasmAbsent = !existsSync(P)` →
 *      {wasmAbsent, existsSync, P, …}).
 *   2. PROBE SYMBOLS. A capability C's probe symbols = {C's export symbol} ∪ {symbols that appear in
 *      C's closure AND NO OTHER capability's closure}. The export symbol is always unique by
 *      construction; a shared library symbol (`existsSync`, in wasm-absent AND wasm-dist-staged AND
 *      astro-example-not-built) is EXCLUDED, so it can never cross-link; a probe-specific symbol
 *      (`FFMPEG_RENDER_CAPABLE`, in ffmpeg-absent alone) IS a probe symbol, so a guard that references
 *      the underlying probe (not the canonical export) still links.
 *   3. LINK. For each sanctioned skip, it collects every guard condition governing it
 *      ({@link guardExpressionsOf}: the `.skipIf`/`.runIf` arg, a `.skip(<cond>,…)` arg, enclosing
 *      ternary + `if` conditions), unions their symbol closures, and intersects with each capability's
 *      probe symbols. `linkedCapabilities` = the capabilities the guard derives from. `linked` =
 *      the DECLARED capability is among them. A guard that derives from NO capability probe
 *      (`if (Math.random())`) — or from the WRONG one (a wasm probe under an `ffmpeg-absent` label) —
 *      is `linked: false`: a placeholder dressed as a gate, or a mislabel.
 *
 * TERMINATION. The closure walk is a BFS over a finite symbol graph guarded by a `seen` set (a symbol
 * is expanded once) and a hop budget; it provably halts. Determinism: the corpus is built from the
 * sorted injected file list; results are sorted by (file, line); no `Date.now`/`Math.random`.
 *
 * THE HONEST LIMIT. The closure follows `const`/`let` initializers + import aliases (the shapes real
 * capability probes use); it does not model field aliasing, reassignment, or dynamic dispatch (the
 * same documented bounds as the taint oracle). A probe routed through such a shape would not link —
 * surfacing as a finding to be made explicit, never silently passed.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * @module
 */
import ts from 'typescript';
import { resolve } from 'node:path';
import type { CapabilityLinkFacts, CapabilityLinkResult } from '@liteship/gauntlet';
import { guardExpressionsOf, constTruthiness } from './skip-detect-ast.js';
import { createTypeDirectedProgram } from './ts-program.js';

/** The oracle id every capability-link fact is tagged with (traceability). */
export const CAPABILITY_LINK_ORACLE_ID = 'ts-capability-link';

/** The bounded symbol-closure hop budget — a termination guard; far above any real probe's depth. */
const CLOSURE_HOP_BUDGET = 50_000;

/** One sanctioned skip to prove — its file, 1-based line, and the capability its allowlist entry declares. */
export interface CapabilitySkipSite {
  readonly file: string;
  readonly line: number;
  readonly declaredCapability: string;
}

/** Injected inputs for {@link buildCapabilityLinkFacts} — all LiteShip-local knowledge comes via these. */
export interface CapabilityLinkOptions {
  /** Absolute repo root; every relative path resolves against it. */
  readonly repoRoot: string;
  /** Repo-relative paths to the canonical capability symbol-table modules (the SET the linker reads). */
  readonly capabilityModules: readonly string[];
  /** The known capability ids (kebab) — only module exports whose kebab name is in this set are probes. */
  readonly capabilityIds: readonly string[];
  /** The sanctioned skip sites to prove. */
  readonly sites: readonly CapabilitySkipSite[];
}

/** `camelCase`/`PascalCase` → `kebab-case` (the export-name ↔ capability-id mapping). */
function camelToKebab(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Build the {@link CapabilityLinkFacts} — the HOST's heavy job. Pure given the inputs + the source on
 * disk: a deterministic `ts.Program` over the capability modules + the sanctioned files yields the same
 * symbol resolutions and the same link results every run (the property the verdict cache needs).
 */
export function buildCapabilityLinkFacts(opts: CapabilityLinkOptions): CapabilityLinkFacts {
  const capIds = new Set(opts.capabilityIds);
  const moduleAbs = opts.capabilityModules.map((f) => resolve(opts.repoRoot, f));
  const siteFilesAbs = [...new Set(opts.sites.map((s) => resolve(opts.repoRoot, s.file)))];
  const program = createTypeDirectedProgram([...moduleAbs, ...siteFilesAbs], opts.repoRoot);
  const checker = program.getTypeChecker();

  const deAlias = (s: ts.Symbol): ts.Symbol =>
    (s.flags & ts.SymbolFlags.Alias) !== 0 ? checker.getAliasedSymbol(s) : s;

  /** BFS the symbol closure from a start node — every symbol reachable via `const`/`let` initializers. */
  const closureOf = (start: ts.Node): Set<ts.Symbol> => {
    const out = new Set<ts.Symbol>();
    const queue: ts.Node[] = [start];
    let hops = 0;
    while (queue.length > 0 && hops++ < CLOSURE_HOP_BUDGET) {
      const visit = (n: ts.Node): void => {
        if (ts.isIdentifier(n)) {
          const sym = checker.getSymbolAtLocation(n);
          if (sym !== undefined) {
            const real = deAlias(sym);
            if (!out.has(real)) {
              out.add(real);
              for (const d of real.declarations ?? []) {
                if (ts.isVariableDeclaration(d) && d.initializer !== undefined) queue.push(d.initializer);
              }
            }
          }
        }
        ts.forEachChild(n, visit);
      };
      visit(queue.shift()!);
    }
    return out;
  };

  // ── 1. SYMBOL TABLE.
  //  - `capExports`: EVERY top-level export of the capability modules — the TRUSTED single-source probe
  //    surface. A guard may route through any of them; the PURITY walk stops AT a capExport (never
  //    descending into its low-level internals like `process`/`existsSync`), so the export is the
  //    reviewable boundary. This is what makes the proof "routes through the canonical export", NOT
  //    "shares a low-level symbol" (codex round-9: linking on a shared `process` let a reimplemented /
  //    mixed guard launder as gated).
  //  - `exportSym` / `exportClosure`: the cap-id-NAMED export per capability (the link target) + its
  //    closure (for finding a capability's OTHER unique export, e.g. `FFMPEG_RENDER_CAPABLE`).
  const capExports = new Set<ts.Symbol>();
  const exportSym = new Map<string, ts.Symbol>();
  const exportClosure = new Map<string, Set<ts.Symbol>>();
  for (const abs of moduleAbs) {
    const sf = program.getSourceFile(abs);
    if (sf === undefined) continue;
    const modSym = checker.getSymbolAtLocation(sf);
    if (modSym === undefined) continue;
    for (const exp of checker.getExportsOfModule(modSym)) {
      const sym = deAlias(exp);
      capExports.add(sym);
      const capId = camelToKebab(exp.getName());
      if (capIds.has(capId)) {
        exportSym.set(capId, sym);
        exportClosure.set(capId, closureOf(sym.valueDeclaration ?? sf));
      }
    }
  }

  // ── 2. CAPABILITY SYMBOLS per capability: its cap-id export ∪ OTHER capability-module EXPORTS uniquely
  //  in its closure (e.g. `FFMPEG_RENDER_CAPABLE` for `ffmpeg-absent`, since `ffmpegAbsent = !FFMPEG_…`).
  //  RESTRICTED to `capExports` — a shared low-level symbol (`existsSync`, in 3 capabilities; `process`,
  //  in coverage's closure) is EXCLUDED, so a guard links ONLY by referencing a named capability EXPORT,
  //  never by sharing a probe's internals.
  const multiplicity = new Map<ts.Symbol, number>();
  for (const cl of exportClosure.values()) for (const s of cl) multiplicity.set(s, (multiplicity.get(s) ?? 0) + 1);
  const capabilitySymbols = new Map<string, Set<ts.Symbol>>();
  for (const [capId, cl] of exportClosure) {
    const syms = new Set<ts.Symbol>([exportSym.get(capId)!]);
    for (const s of cl) if (capExports.has(s) && multiplicity.get(s) === 1) syms.add(s);
    capabilitySymbols.set(capId, syms);
  }

  // ── 3. LINK each sanctioned site. The guard must (a) be PURE — every runtime symbol it references is a
  //  capability-module export or a local that resolves purely to one (no free global like `Math`, no
  //  reimplemented low-level probe, no `||` to an unrelated condition), so the skip fires ONLY when a
  //  capability holds — AND (b) reach a capability symbol of its DECLARED capability.
  const results: CapabilityLinkResult[] = [];
  for (const site of opts.sites) {
    const sf = program.getSourceFile(resolve(opts.repoRoot, site.file));
    const skipNode = sf !== undefined && site.line > 0 ? findSkipNodeAtLine(sf, site.line) : undefined;
    // FAIL-CLOSED (codex round-9): a sanctioned site that cannot be located (allowlist drift — the line
    // did not resolve, or the skip is gone) is NOT silently dropped; it surfaces as an unlinked result.
    if (skipNode === undefined) {
      results.push({
        file: site.file,
        line: site.line,
        declaredCapability: site.declaredCapability,
        linkedCapabilities: [],
        linked: false,
        guardText: '(sanctioned skip not located — allowlist drift or the skip was removed)',
      });
      continue;
    }
    const guards = guardExpressionsOf(skipNode);
    let pure = true;
    let gatedGuardCount = 0;
    const reached = new Set<ts.Symbol>();
    for (const g of guards) {
      // A VACUOUS guard (`true || probe`, `false && …`) is a compile-time constant — the skip fires
      // (or not) unconditionally, so it contributes NO gating (codex round-9 sweep). It is skipped, not
      // counted; the conditionality gate independently rejects such a placeholder skip.
      if (constTruthiness(g) !== undefined) continue;
      gatedGuardCount++;
      const a = analyzeGuard(checker, capExports, deAlias, g);
      if (!a.pure) pure = false;
      for (const s of a.reached) reached.add(s);
    }
    // Links ONLY when every runtime (non-vacuous) guard is PURE and at least one reaches a capability —
    // an impure guard, no runtime guard at all, or a vacuous one links to NOTHING.
    const linkedCapabilities =
      pure && gatedGuardCount > 0
        ? [...capabilitySymbols.keys()]
            .filter((capId) => [...capabilitySymbols.get(capId)!].some((s) => reached.has(s)))
            .sort()
        : [];
    results.push({
      file: site.file,
      line: site.line,
      declaredCapability: site.declaredCapability,
      linkedCapabilities,
      linked: linkedCapabilities.includes(site.declaredCapability),
      guardText: guards
        .map((g) => g.getText(sf).replace(/\s+/g, ' ').trim())
        .join(' && ')
        .slice(0, 200),
    });
  }
  results.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line));

  return {
    _tag: 'capability-link-facts',
    definedCapabilities: [...exportSym.keys()].sort(),
    results,
  };
}

/** Neutral identifiers — JS constants, not free runtime references. */
const NEUTRAL_IDENTIFIERS: ReadonlySet<string> = new Set(['undefined', 'NaN', 'Infinity']);

/**
 * Walk a guard expression, returning the capability-module EXPORTS it reaches (through pure local
 * aliases) and whether it is PURE. PURE iff EVERY runtime identifier it references is a capability-module
 * export (the trusted single-source leaf — never descended into) or a local `const` that resolves purely
 * to one. A free global (`Math`), a non-capability import (`existsSync` used directly), a parameter, or a
 * reimplemented low-level probe (`process.env.…`) makes it IMPURE — the skip could then fire on a
 * condition OTHER than a capability, so it is not genuinely capability-gated.
 *
 * Codex round-9: this replaces "the guard shares any symbol unique to a capability's closure", which
 * linked a MIXED guard (`Math.random() || coverageInstrumentation`) and a REIMPLEMENTED probe
 * (`process.env.NODE_V8_COVERAGE !== undefined`, sharing the low-level `process` symbol) as gated.
 */
function analyzeGuard(
  checker: ts.TypeChecker,
  capExports: ReadonlySet<ts.Symbol>,
  deAlias: (s: ts.Symbol) => ts.Symbol,
  expr: ts.Expression,
): { reached: Set<ts.Symbol>; pure: boolean } {
  const seen = new Set<ts.Symbol>();
  const thunkSeen = new Set<ts.Symbol>();

  const pureEmpty = (): { reached: Set<ts.Symbol>; pure: boolean } => ({ reached: new Set<ts.Symbol>(), pure: true });
  const impure = (): { reached: Set<ts.Symbol>; pure: boolean } => ({ reached: new Set<ts.Symbol>(), pure: false });
  const merge = (
    a: { reached: Set<ts.Symbol>; pure: boolean },
    b: { reached: Set<ts.Symbol>; pure: boolean },
  ): { reached: Set<ts.Symbol>; pure: boolean } => ({
    reached: new Set<ts.Symbol>([...a.reached, ...b.reached]),
    pure: a.pure && b.pure,
  });

  const analyzeFunctionReturn = (fn: ts.FunctionLikeDeclarationBase): { reached: Set<ts.Symbol>; pure: boolean } => {
    if (fn.parameters.length > 0 || fn.body === undefined) return impure();
    if (ts.isArrowFunction(fn) && !ts.isBlock(fn.body)) return analyze(fn.body);
    if (!ts.isBlock(fn.body)) return impure();
    const statements = fn.body.statements;
    if (statements.length !== 1) return impure();
    const [stmt] = statements;
    if (stmt === undefined || !ts.isReturnStatement(stmt) || stmt.expression === undefined) return impure();
    return analyze(stmt.expression);
  };

  const functionForCall = (sym: ts.Symbol): ts.FunctionLikeDeclarationBase | undefined => {
    const decl = sym.valueDeclaration;
    if (decl !== undefined && ts.isFunctionDeclaration(decl)) return decl;
    if (decl !== undefined && ts.isVariableDeclaration(decl) && decl.initializer !== undefined) {
      const init = unwrapGuardExpr(decl.initializer);
      if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) return init;
    }
    return undefined;
  };

  const analyzeIdentifier = (node: ts.Identifier): { reached: Set<ts.Symbol>; pure: boolean } => {
    if (NEUTRAL_IDENTIFIERS.has(node.text)) return pureEmpty();
    const sym = checker.getSymbolAtLocation(node);
    if (sym === undefined) return impure();
    const real = deAlias(sym);
    if (capExports.has(real)) {
      return { reached: new Set<ts.Symbol>([real]), pure: true }; // trusted leaf — do not descend
    }
    if (seen.has(real)) return impure();
    seen.add(real);
    const decl = real.valueDeclaration;
    if (decl !== undefined && ts.isVariableDeclaration(decl) && decl.initializer !== undefined) {
      const init = unwrapGuardExpr(decl.initializer);
      if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) return impure();
      return analyze(init);
    }
    return impure(); // global / non-capability import / parameter / function object
  };

  const analyzeCallee = (callee: ts.Expression): { reached: Set<ts.Symbol>; pure: boolean } => {
    const c = unwrapGuardExpr(callee);
    if (!ts.isIdentifier(c)) return impure();
    const sym = checker.getSymbolAtLocation(c);
    if (sym === undefined) return impure();
    const real = deAlias(sym);
    if (thunkSeen.has(real)) return impure();
    const fn = functionForCall(real);
    if (fn === undefined) return impure();
    thunkSeen.add(real);
    const out = analyzeFunctionReturn(fn);
    thunkSeen.delete(real);
    return out;
  };

  const analyze = (node: ts.Expression): { reached: Set<ts.Symbol>; pure: boolean } => {
    const e = unwrapGuardExpr(node);
    if (constTruthiness(e) !== undefined) return pureEmpty();
    if (ts.isIdentifier(e)) return analyzeIdentifier(e);
    if (ts.isPrefixUnaryExpression(e)) {
      if (e.operator === ts.SyntaxKind.ExclamationToken) return analyze(e.operand);
      return impure();
    }
    if (ts.isBinaryExpression(e)) {
      const op = e.operatorToken.kind;
      if (op === ts.SyntaxKind.AmpersandAmpersandToken || op === ts.SyntaxKind.BarBarToken) {
        return merge(analyze(e.left), analyze(e.right));
      }
      if (COMPARISON_OPERATORS.has(op)) return merge(analyze(e.left), analyze(e.right));
      return impure();
    }
    if (ts.isConditionalExpression(e))
      return merge(analyze(e.condition), merge(analyze(e.whenTrue), analyze(e.whenFalse)));
    if (ts.isCallExpression(e)) {
      if (ts.isIdentifier(e.expression) && e.expression.text === 'Boolean' && e.arguments.length === 1) {
        return analyze(e.arguments[0]!);
      }
      if (e.arguments.length === 0) return analyzeCallee(e.expression);
      return impure();
    }
    if (ts.isPropertyAccessExpression(e)) return impure();
    if (ts.isElementAccessExpression(e)) return impure();
    return impure();
  };
  return analyze(expr);
}

const COMPARISON_OPERATORS: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.LessThanToken,
  ts.SyntaxKind.GreaterThanToken,
  ts.SyntaxKind.LessThanEqualsToken,
  ts.SyntaxKind.GreaterThanEqualsToken,
]);

function unwrapGuardExpr(expr: ts.Expression): ts.Expression {
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
    return e;
  }
}

/**
 * Locate the skip access node at `line` (1-based) in `sf` — the OUTERMOST `.skip`/`.todo`/`.fails`/
 * `.skipIf`/`.runIf` member access (dotted or `["skip"]`) whose access starts on that line. The guard
 * walk ({@link guardExpressionsOf}) ascends from it to find every governing condition.
 */
function findSkipNodeAtLine(sf: ts.SourceFile, line: number): ts.Node | undefined {
  const SKIP_MEMBERS = new Set(['skip', 'todo', 'fails', 'skipIf', 'runIf']);
  let found: ts.Node | undefined;
  const visit = (n: ts.Node): void => {
    if (found !== undefined) return;
    const member = ts.isPropertyAccessExpression(n)
      ? n.name.text
      : ts.isElementAccessExpression(n) && ts.isStringLiteralLike(n.argumentExpression)
        ? n.argumentExpression.text
        : undefined;
    if (member !== undefined && SKIP_MEMBERS.has(member)) {
      const startLine = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
      if (startLine === line) {
        found = n;
        return;
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return found;
}
