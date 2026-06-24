/**
 * THE CAPABILITY-LINK ORACLE — the dataflow proof that a sanctioned capability-gated skip's GUARD
 * DERIVES FROM its declared capability's probe (codex round-8, #1b). Sibling of the taint oracle:
 * it builds a type-directed `ts.Program` + checker over the canonical capability symbol-table modules
 * and the sanctioned skip files, and for each skip resolves its guard condition's symbols to prove the
 * guard reaches the capability it claims. It emits GENERIC {@link CapabilityLinkFacts} and stays
 * LiteShip-AGNOSTIC: the capability-module SET, the capability id set, and the sanctioned sites are
 * INJECTED ({@link CapabilityLinkOptions}) — `@czap/audit` names no LiteShip capability.
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
import type { CapabilityLinkFacts, CapabilityLinkResult } from '@czap/gauntlet';
import { guardExpressionsOf } from './skip-detect-ast.js';
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

  // ── 1. SYMBOL TABLE: capability id → export symbol + closure (exports matching a known capability id).
  const exportSym = new Map<string, ts.Symbol>();
  const exportClosure = new Map<string, Set<ts.Symbol>>();
  for (const abs of moduleAbs) {
    const sf = program.getSourceFile(abs);
    if (sf === undefined) continue;
    const modSym = checker.getSymbolAtLocation(sf);
    if (modSym === undefined) continue;
    for (const exp of checker.getExportsOfModule(modSym)) {
      const capId = camelToKebab(exp.getName());
      if (!capIds.has(capId)) continue;
      const sym = deAlias(exp);
      exportSym.set(capId, sym);
      exportClosure.set(capId, closureOf(sym.valueDeclaration ?? sf));
    }
  }

  // ── 2. PROBE SYMBOLS: export symbol ∪ symbols unique to that one capability's closure.
  const multiplicity = new Map<ts.Symbol, number>();
  for (const cl of exportClosure.values()) for (const s of cl) multiplicity.set(s, (multiplicity.get(s) ?? 0) + 1);
  const probeSymbols = new Map<string, Set<ts.Symbol>>();
  for (const [capId, cl] of exportClosure) {
    const probes = new Set<ts.Symbol>([exportSym.get(capId)!]);
    for (const s of cl) if (multiplicity.get(s) === 1) probes.add(s);
    probeSymbols.set(capId, probes);
  }

  // ── 3. LINK each sanctioned site's guard against the probe symbols.
  const results: CapabilityLinkResult[] = [];
  for (const site of opts.sites) {
    const sf = program.getSourceFile(resolve(opts.repoRoot, site.file));
    const skipNode = sf !== undefined ? findSkipNodeAtLine(sf, site.line) : undefined;
    const guards = skipNode !== undefined ? guardExpressionsOf(skipNode) : [];
    const guardClosure = new Set<ts.Symbol>();
    for (const g of guards) for (const s of closureOf(g)) guardClosure.add(s);
    const linkedCapabilities = [...probeSymbols.keys()]
      .filter((capId) => [...probeSymbols.get(capId)!].some((s) => guardClosure.has(s)))
      .sort();
    const guardText = guards
      .map((g) => g.getText(sf).replace(/\s+/g, ' ').trim())
      .join(' && ')
      .slice(0, 200);
    results.push({
      file: site.file,
      line: site.line,
      declaredCapability: site.declaredCapability,
      linkedCapabilities,
      linked: linkedCapabilities.includes(site.declaredCapability),
      guardText,
    });
  }
  results.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line));

  return {
    _tag: 'capability-link-facts',
    definedCapabilities: [...exportSym.keys()].sort(),
    results,
  };
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
