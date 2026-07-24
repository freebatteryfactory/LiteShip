/**
 * The SYMBOL-EVIDENCED ⊕ FILE-PROXY orphan-divergence gate (Slice B, B3 — the
 * LanguageService cross-check, the headline of the "rest of the oracle set").
 *
 * Two oracles observe whether an exported symbol is REFERENCED across files:
 *   • the IR's `refs` reverse index — built by `buildRepoIR` from AST name-match
 *     (an import specifier resolved to a target file credits every by-name binding
 *     it pulls). This is `file-proxy-only`: it matches NAMES, it does not RESOLVE
 *     symbols, so it credits a reference a colliding name produces and misses one a
 *     re-export / alias chain hides behind a barrel.
 *   • the `ts-language-service` oracle's `symbol-orphan` facts (in `@liteship/audit`) —
 *     resolved by a real `getReferencesAtPosition`. This is `symbol-evidenced`: it
 *     follows the symbol through re-exports and aliases and never credits a mere
 *     name collision. The strongest static evidence.
 *
 * This gate folds `ctx.ir.facts`, and for each symbol the LanguageService observed
 * it cross-checks the symbol-evidenced verdict (orphan vs referenced) against the
 * file-proxy `refs` reverse index for the SAME `<file>#<name>` SymbolId. Where the
 * two DISAGREE — the file-proxy graph credits a reference the LanguageService
 * resolved as an orphan (a name collision the weak graph launders), or the
 * LanguageService resolved a reference the graph missed (a re-export the
 * name-match could not follow) — it emits a SELF-EXPLAINING, fully-traceable
 * divergence {@link Finding} naming BOTH oracles, BOTH coverage classes, and the
 * location, per the ratified REPORT-not-DECIDE model. The engine picks NO winner;
 * the reader (human via CLI/LSP, agent via MCP) decides.
 *
 * Severity is calibrated from the coverage-class PAIR via the redlinable
 * {@link coverageClassSeverity} matrix: `symbol-evidenced` (the LanguageService)
 * vs `file-proxy-only` (the IR graph) is a CROSS-class pair → `advisory`. That is
 * exactly right: the file-proxy graph is KNOWN-imprecise, so this divergence is
 * not a contradiction between equals — it is the retire-the-weak-graph signal (the
 * design's "the LanguageService replaces and cross-checks the hand-rolled graph").
 *
 * THE LAW (the 0.2.3 head-probe scar, as an engine invariant): the comparison is
 * computed from the LIVE IR facts + the LIVE `refs` index — never a hardcoded
 * constant, never a proxy beside the IR. The fixtures prove it with teeth: a
 * mutant that IGNORES the symbol-evidenced facts (trusts only the file-proxy
 * graph) reports NO divergence on the red fixture and is killed.
 *
 * It REQUIRES the injected IR (it folds the IR's facts + reads its `refs`), so it
 * runs only on the host path where the CLI builds + injects the IR via
 * `@liteship/audit`'s LanguageService oracle; the lean MCP/command path does not run
 * it. The gauntlet stays lean: this gate is PURE — no `typescript` import. The
 * LanguageService lives in `@liteship/audit`; this gate only folds the facts it emits.
 *
 * @module
 */

import { defineGate, requireIR, type GateContext, type Gate } from '../gate.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import {
  makeRepoIR,
  coverageClassSeverity,
  strongerCoverageClass,
  type Fact,
  type CoverageClass,
  type RepoIR,
  type SymbolId,
  type RefSite,
} from '../repo-ir.js';

/** The shared rule id this gate's findings trace to. */
const RULE_ID = 'gauntlet/symbol-orphan-divergence';

/** The symbol-evidenced oracle id (mirrors `@liteship/audit`'s `LANGUAGE_SERVICE_ORACLE_ID`). */
const SYMBOL_ORACLE = 'ts-language-service';

/** The property the symbol-evidenced oracle emits its orphan verdict under. */
const SYMBOL_ORPHAN_PROPERTY = 'symbol-orphan';

/** The coverage class of the file-proxy module graph (the IR's `refs` index). */
const FILE_PROXY_CLASS: CoverageClass = 'file-proxy-only';

/**
 * The structured payload of a `symbol-orphan` fact's `value` (mirrors
 * `@liteship/audit`'s `OrphanValue`). The fact's `value` is `unknown`, so it MUST be
 * narrowed to this shape before use — {@link asOrphanValue} is that guard.
 */
interface OrphanValue {
  readonly name: string;
  readonly isOrphan: boolean;
  readonly externalReferenceCount: number;
}

/**
 * Narrow a {@link Fact}'s `unknown` value to {@link OrphanValue}. The value is
 * `unknown` precisely so a consumer cannot read it blindly — this is the forced
 * guard. Returns `undefined` for any other shape (a malformed fact is simply not
 * an orphan observation; never a throw, never a silent mis-read).
 */
function asOrphanValue(value: unknown): OrphanValue | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.name === 'string' &&
    typeof candidate.isOrphan === 'boolean' &&
    typeof candidate.externalReferenceCount === 'number'
  ) {
    return {
      name: candidate.name,
      isOrphan: candidate.isOrphan,
      externalReferenceCount: candidate.externalReferenceCount,
    };
  }
  return undefined;
}

/** The IR SymbolId (`<file>#<name>`) an orphan fact concerns — the join key into `refs`. */
function symbolIdOf(file: string, value: OrphanValue): SymbolId {
  return `${file}#${value.name}`;
}

/**
 * Does the IR's FILE-PROXY `refs` reverse index credit a CROSS-FILE reference to
 * `symbolId` declared in `declFile`? The file-proxy graph's notion of "referenced"
 * is a ref SITE in a file OTHER than the declaration file (the same external-only
 * notion the symbol-evidenced oracle uses, so the two are comparable). A symbol
 * with no `refs` entry, or one whose only sites are in its own declaration file,
 * is file-proxy-orphan. Computed entirely from the LIVE `refs` index (the
 * head-probe LAW — never a hardcoded expectation).
 */
function fileProxyHasExternalRef(
  refs: ReadonlyMap<SymbolId, readonly RefSite[]>,
  symbolId: SymbolId,
  declFile: string,
): boolean {
  const sites = refs.get(symbolId);
  if (sites === undefined) return false;
  return sites.some((site) => site.fromFile !== declFile);
}

/** One disagreement: the symbol, where it is, and what each oracle concluded. */
interface Divergence {
  readonly file: string;
  readonly line: number | undefined;
  readonly symbolId: SymbolId;
  readonly symbolName: string;
  /** The symbol-evidenced verdict: did the LanguageService resolve it as an orphan? */
  readonly symbolEvidencedOrphan: boolean;
  /** The resolved external reference count (the magnitude the reader sees). */
  readonly externalReferenceCount: number;
  /** The file-proxy verdict: does the `refs` graph credit a cross-file reference? */
  readonly fileProxyReferenced: boolean;
}

/**
 * Compute the divergences from the LIVE IR: for each `symbol-orphan`/symbol-evidenced
 * fact, narrow its payload, reconstruct the SymbolId, ask the file-proxy `refs`
 * index whether IT credits a cross-file reference, and record a disagreement when
 * the two verdicts differ. `symbol-evidenced orphan` means "no external ref";
 * `file-proxy referenced` means "the graph credits an external ref" — they DISAGREE
 * when one says referenced and the other says orphan. Both directions are reported
 * (the graph over-credits a collision OR under-credits a hidden re-export). Sorted
 * for determinism (file, line, symbol).
 */
function computeDivergences(ir: RepoIR): readonly Divergence[] {
  const divergences: Divergence[] = [];
  for (const fact of ir.facts) {
    if (fact.property !== SYMBOL_ORPHAN_PROPERTY || fact.oracleId !== SYMBOL_ORACLE) continue;
    const value = asOrphanValue(fact.value);
    if (value === undefined) continue;
    const symbolId = symbolIdOf(fact.file, value);
    const fileProxyReferenced = fileProxyHasExternalRef(ir.refs, symbolId, fact.file);
    // symbol-evidenced says "orphan" (no external ref) but file-proxy says
    // "referenced" — OR the reverse. Either is a disagreement.
    const symbolEvidencedReferenced = !value.isOrphan;
    if (symbolEvidencedReferenced === fileProxyReferenced) continue;
    divergences.push({
      file: fact.file,
      line: fact.line,
      symbolId,
      symbolName: value.name,
      symbolEvidencedOrphan: value.isOrphan,
      externalReferenceCount: value.externalReferenceCount,
      fileProxyReferenced,
    });
  }
  return divergences.sort(
    (a, b) => a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0) || a.symbolId.localeCompare(b.symbolId),
  );
}

/**
 * Build the self-explaining divergence finding for one disagreement. Names BOTH
 * oracles + BOTH coverage classes + the location; the engine picks no winner.
 * Severity is calibrated from the PAIR (`symbol-evidenced`, `file-proxy-only`) via
 * the redlinable {@link coverageClassSeverity} matrix — a cross-class pair →
 * `advisory` (the file-proxy graph is known-imprecise; this is the retire signal).
 */
function divergenceFinding(divergence: Divergence): Finding {
  const symbolClass: CoverageClass = 'symbol-evidenced';
  const severity = coverageClassSeverity(symbolClass, FILE_PROXY_CLASS);
  const carriedClass = strongerCoverageClass(symbolClass, FILE_PROXY_CLASS);
  const loc = `${divergence.file}:${divergence.line ?? 0}`;

  // The two directions read differently — the explanation IS the coverage class.
  const why = divergence.symbolEvidencedOrphan
    ? `\`${SYMBOL_ORACLE}\` (symbol-evidenced) resolved ZERO cross-file references to \`${divergence.symbolName}\`, but the IR's file-proxy \`refs\` graph credits one — the file-proxy graph matched a NAME (a re-export barrel or a colliding name) the checker does not resolve to this symbol. The symbol-evidenced verdict is the stronger evidence: this is the signal to retire the hand-rolled name-match graph for reference detection`
    : `\`${SYMBOL_ORACLE}\` (symbol-evidenced) resolved ${divergence.externalReferenceCount} cross-file reference(s) to \`${divergence.symbolName}\`, but the IR's file-proxy \`refs\` graph credits NONE — the name-match graph could not follow the re-export / alias chain the checker resolved. The symbol-evidenced verdict is the stronger evidence`;

  return finding({
    ruleId: RULE_ID,
    severity,
    level: 'L1',
    title: `Orphan-evidence divergence on ${divergence.symbolName} at ${loc}`,
    detail: `${why}. The engine picks no winner — the reader decides. (severity ${severity}: cross-class coverage gap, symbol-evidenced vs file-proxy-only.)`,
    location: { file: divergence.file, ...(divergence.line !== undefined ? { line: divergence.line } : {}) },
    coverageClass: carriedClass,
    remediation: {
      kind: 'instruction',
      description: 'Resolve the orphan-evidence divergence — the engine reports, you decide.',
      steps: [
        `Open ${loc} and inspect the exported symbol \`${divergence.symbolName}\`.`,
        divergence.symbolEvidencedOrphan
          ? 'The LanguageService resolved no real cross-file consumer; the file-proxy graph credited a name-only match. Treat the symbol-evidenced orphan as authoritative — and this divergence as evidence to retire the file-proxy reference graph in favour of the LanguageService oracle.'
          : 'The LanguageService resolved a real cross-file consumer the name-match graph missed (a re-export / alias chain). Prefer the LanguageService oracle for reference evidence.',
      ],
    },
  });
}

/**
 * Fold the IR's facts into divergence findings — one per symbol where the
 * symbol-evidenced LanguageService oracle and the file-proxy `refs` graph
 * DISAGREE about whether the symbol is referenced across files. Agreement (both
 * orphan, or both referenced) emits NOTHING. Computed entirely from the LIVE IR
 * facts + `refs` index (the head-probe LAW).
 */
function fold(context: GateContext): readonly Finding[] {
  const ir = requireIR(context, RULE_ID);
  return computeDivergences(ir).map(divergenceFinding);
}

// ── Fixtures (in-memory IRs — the meta-gauntlet self-proof) ─────────────────

/** A {@link GateContext} carrying ONLY an in-memory IR — for the fixtures. */
function irContext(ir: RepoIR): GateContext {
  return { ...memoryContext({}), ir };
}

/** The declaration file + the consumer file the fixtures share. */
const DECL_FILE = 'packages/x/src/decl.ts';
const CONSUMER_FILE = 'packages/x/src/consumer.ts';

/** Build a `symbol-orphan`/symbol-evidenced fact for `name` declared in `DECL_FILE`. */
function orphanFact(name: string, isOrphan: boolean, externalReferenceCount: number, line: number): Fact {
  return {
    file: DECL_FILE,
    line,
    property: SYMBOL_ORPHAN_PROPERTY,
    value: { name, isOrphan, externalReferenceCount },
    oracleId: SYMBOL_ORACLE,
    coverageClass: 'symbol-evidenced',
  };
}

/** The SymbolNode for `name` in `DECL_FILE` (so the `refs` key is a known SymbolId). */
function declSymbol(
  name: string,
  line: number,
): {
  id: SymbolId;
  name: string;
  kind: 'const';
  file: string;
  location: { file: string; line: number };
} {
  return { id: `${DECL_FILE}#${name}`, name, kind: 'const', file: DECL_FILE, location: { file: DECL_FILE, line } };
}

/**
 * RED — the headline divergence: the symbol-evidenced oracle resolved `widget` as
 * an ORPHAN (zero cross-file references), but the file-proxy `refs` graph credits
 * a cross-file reference (a name-only match — a colliding name the checker does not
 * resolve here). The two oracles DISAGREE → the gate MUST emit ≥1 divergence. This
 * is the recon's capsule-detector case generalized: file-proxy says referenced,
 * symbol-evidenced says orphan, symbol wins.
 */
function redIR(): RepoIR {
  const refs = new Map<SymbolId, readonly RefSite[]>([
    // The file-proxy graph credits a cross-file ref to widget — a NAME match.
    [`${DECL_FILE}#widget`, [{ fromFile: CONSUMER_FILE, coverageClass: FILE_PROXY_CLASS }]],
  ]);
  return makeRepoIR({
    files: [
      { id: DECL_FILE, contentDigest: 'placeholder:no-content-address', packageName: '@liteship/x' },
      { id: CONSUMER_FILE, contentDigest: 'placeholder:no-content-address', packageName: '@liteship/x' },
    ],
    symbols: [declSymbol('widget', 3)],
    refs,
    // symbol-evidenced: widget is an ORPHAN (no real cross-file reference).
    facts: [orphanFact('widget', true, 0, 3)],
  });
}

/**
 * GREEN — the agreement floor: BOTH oracles agree on TWO symbols. `referenced` is
 * referenced by both (symbol-evidenced count 1 + a file-proxy ref site); `lonely`
 * is an orphan by both (symbol-evidenced orphan + NO file-proxy ref site). Neither
 * is a divergence → the correct gate emits 0 findings. The mutant that ignores the
 * symbol-evidenced facts is killed on the RED fixture, not here; this green pins
 * the false-positive floor (agreement must never be reported).
 */
function greenIR(): RepoIR {
  const refs = new Map<SymbolId, readonly RefSite[]>([
    // `referenced` has a real cross-file ref site — both oracles agree it is used.
    [`${DECL_FILE}#referenced`, [{ fromFile: CONSUMER_FILE, coverageClass: FILE_PROXY_CLASS }]],
    // `lonely` has NO entry → both oracles agree it is an orphan.
  ]);
  return makeRepoIR({
    files: [
      { id: DECL_FILE, contentDigest: 'placeholder:no-content-address', packageName: '@liteship/x' },
      { id: CONSUMER_FILE, contentDigest: 'placeholder:no-content-address', packageName: '@liteship/x' },
    ],
    symbols: [declSymbol('referenced', 1), declSymbol('lonely', 2)],
    refs,
    facts: [
      orphanFact('referenced', false, 1, 1), // symbol-evidenced: referenced (1 external ref).
      orphanFact('lonely', true, 0, 2), // symbol-evidenced: orphan (0 external refs).
    ],
  });
}

/**
 * The symbol-orphan-divergence gate — the meta-gauntlet self-proof. Its
 * red/green/mutation fixtures are in-memory {@link RepoIR}s where the
 * symbol-evidenced oracle and the file-proxy `refs` graph agree or disagree, and
 * they ARE the proof the gate catches an injected divergence. Earns blocking
 * authority via the existing ratchet — no engine change.
 */
export const symbolOrphanDivergenceGate: Gate = defineGate({
  id: RULE_ID,
  level: 'L1',
  describe:
    'Reports a divergence when the symbol-evidenced LanguageService oracle and the IR file-proxy refs graph disagree on whether an exported symbol is referenced across files (the file-proxy graph credits a name-only match the checker resolves as an orphan, or misses a re-export the checker resolves). Reports, never decides.',
  run: fold,
  fixtures: {
    red: {
      name: 'an IR where symbol-evidenced says orphan but the file-proxy refs graph credits a reference',
      context: irContext(redIR()),
    },
    green: {
      name: 'an IR where both oracles agree (one referenced symbol, one orphan symbol)',
      context: irContext(greenIR()),
    },
    mutation: {
      describe:
        'A mutant that IGNORES the symbol-evidenced facts (trusts ONLY the file-proxy refs graph) finds no disagreement to compare against — it reports NO divergence on the red fixture (where the symbol-evidenced orphan contradicts the file-proxy reference), so red is no longer flagged and the mutant is killed.',
      mutate: (gate: Gate): Gate => ({
        ...gate,
        // Mutant: blind to the symbol-evidenced facts — returns no findings at all
        // (it has no symbol-evidenced verdict to cross-check, so it can find no
        // divergence). The red fixture then yields 0 findings → red fails to flag →
        // the mutant is killed by red. This proves the gate's verdict GENUINELY
        // depends on the symbol-evidenced facts, not on the file-proxy graph alone.
        run: (): readonly Finding[] => [],
      }),
    },
  },
});
