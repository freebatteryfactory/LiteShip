/**
 * The MUTATION-DIVERGENCE gate (Slice C, the avionics tier — the capstone of
 * mutation-as-divergence). The lean half: it FOLDS the host-injected mutation
 * {@link MutationFacts} into self-explaining {@link Finding}s, the same
 * REPORT-not-DECIDE shape the oracle-divergence gates use.
 *
 * THE BIG IDEA, restated as a gate. A surviving mutant is an oracle divergence: the
 * original and the mutated code produced IDENTICAL test results when they should
 * have diverged → the covered behaviour is untested. So each SURVIVOR (and each
 * NO-COVERAGE mutant, a strictly worse signal — untested with not even a missing
 * test) becomes a Finding at the file's EFFECTIVE assurance level, carrying the
 * operator + the location + the `originalText`→`mutatedText` rewrite (so the
 * dev/agent sees EXACTLY what survived). A `killed` mutant is adequate coverage — no
 * finding. An `equivalent` mutant (a justified, content-addressed registry entry — a
 * RUNTIME mutation the engine cannot statically exclude but that is provably
 * behaviour-identical, e.g. an unreachable comparator boundary on distinct object
 * keys) is ALSO no finding and is excluded from the score denominator: it is not a
 * coverage gap, so counting it would cap the honest score below 1.0 forever.
 *
 * AIM THE CANNON (the kill-floor by level). The severity of a survivor scales with
 * the file's effective level (the {@link propagateAssuranceLevels} fixpoint over the
 * IR's import graph, NOT the raw glob level — a helper pulled into an L4 path
 * inherits L4):
 *   - L4 survivor → `error` (BLOCKS — the trust spine tolerates no untested
 *     behaviour; the kill-floor is 100%).
 *   - L3 survivor → `error` (≥ 90% kill-floor — deterministic runtime paths).
 *   - L2 survivor → `warning` (≥ 75%).
 *   - L1/L0 survivor → `advisory` (sampled debt — calibrating).
 * A no-coverage mutant is one severity-step LOUDER than a survivor at the same level
 * (it is the worse signal), clamped at `error`.
 *
 * THE SCORE RATCHET. The per-file mutation score (killed / total) is compared to the
 * committed baseline ({@link MutationFacts.scoreBaseline}); a DROP below the baseline
 * is a regression finding (the score may only ever rise). This is the same
 * monotone-ratchet discipline as the API-surface / coverage ratchets.
 *
 * REPORT-not-DECIDE. The gate names the survivor, its level, and the exact rewrite,
 * and reports it; the human/agent decides whether to write the missing test. The
 * engine picks no winner. THE LAW (the head-probe scar): the effective level is
 * computed from the LIVE IR's propagation fixpoint, never a hardcoded level beside
 * the file.
 *
 * It {@link requireMutation} (and reads the IR for level propagation), so it runs
 * ONLY on the opt-in host path (`liteship check gates --ir --mutate` — the CLI generates +
 * runs + injects the facts); the lean MCP/command path does not run it. Composition
 * over inheritance: a `_tag` fold + standalone functions, no class.
 *
 * @module
 */

import { defineGate, requireMutation, requireIR, type GateContext, type Gate } from '../gate.js';
import { finding, type Finding, type Severity } from '../finding.js';
import { memoryContext } from '../engine.js';
import { factAccessEvidenceDigest } from '../verdict-cache.js';
import { makeRepoIR, PLACEHOLDER_DIGEST, type RepoIR } from '../repo-ir.js';
import { levelOf } from '../assurance-map.js';
import { propagateAssuranceLevels } from '../assurance-propagation.js';
import type { AssuranceLevel } from '../assurance.js';
import type { MutationFacts, MutantOutcome } from '../facts/mutation-facts.js';

/** The gate id — namespaces every finding (traceability). */
const GATE_ID = 'gauntlet/mutation-divergence';

/**
 * The severity a SURVIVOR earns at a given effective level — the kill-floor
 * calibration, exported DATA a downstream owner can redline (sibling to the
 * coverage-class severity matrix). L4/L3 survivors BLOCK; L2 warns; L1/L0 are
 * advisory debt.
 */
export const SURVIVOR_SEVERITY_BY_LEVEL: Readonly<Record<AssuranceLevel, Severity>> = {
  L4: 'error',
  L3: 'error',
  L2: 'warning',
  L1: 'advisory',
  L0: 'advisory',
} as const;

/** The kill-FLOOR (minimum acceptable score) per level — the blocking ratchet target. */
export const KILL_FLOOR_BY_LEVEL: Readonly<Record<AssuranceLevel, number>> = {
  L4: 1.0,
  L3: 0.9,
  L2: 0.75,
  L1: 0,
  L0: 0,
} as const;

/** Bump a severity one step louder (advisory→warning→error), clamped at error. */
function louder(severity: Severity): Severity {
  if (severity === 'advisory') return 'warning';
  if (severity === 'warning') return 'error';
  return 'error';
}

/**
 * The EFFECTIVE level of every file — the {@link propagateAssuranceLevels} fixpoint
 * over the live IR's import graph, with the glob {@link levelOf} as the floor (THE
 * LAW: computed from the live IR, never a hardcoded level). A file not in the IR
 * (e.g. a fixture's bare file table) falls back to its glob level directly.
 */
function effectiveLevels(ir: RepoIR): ReadonlyMap<string, AssuranceLevel> {
  return propagateAssuranceLevels(ir, (file) => levelOf(file));
}

/** The effective level of one file — the propagated map, or the glob floor if absent. */
function levelForFile(file: string, levels: ReadonlyMap<string, AssuranceLevel>): AssuranceLevel {
  return levels.get(file) ?? levelOf(file);
}

/** A short human description of an operator's rewrite, for the finding detail. */
function rewriteDescription(outcome: MutantOutcome): string {
  return `\`${outcome.operator}\` rewrote \`${outcome.originalText}\` → \`${outcome.mutatedText}\``;
}

/**
 * Build the self-explaining finding for one survived/no-coverage mutant. Names the
 * operator, the exact rewrite, the location, and the effective level; severity is
 * the kill-floor calibration (a no-coverage mutant is one step louder than a
 * survivor at the same level). REPORT-not-DECIDE: the remediation is "write the
 * missing test", the reader acts.
 */
function survivorFinding(outcome: MutantOutcome, level: AssuranceLevel): Finding {
  const isNoCoverage = outcome.verdict === 'no-coverage';
  const base = SURVIVOR_SEVERITY_BY_LEVEL[level];
  const severity = isNoCoverage ? louder(base) : base;
  const loc = `${outcome.file}:${outcome.line}:${outcome.column}`;
  const what = isNoCoverage
    ? 'survived with NO covering test at all — this behaviour is untested (not even a test that missed it)'
    : 'SURVIVED — every covering test passed on the mutated code, so the mutation changed behaviour and nothing noticed: this code path is untested';
  return finding({
    ruleId: GATE_ID,
    severity,
    level,
    title: `Mutant survived at ${loc} (${level})`,
    detail: `${rewriteDescription(outcome)} at ${loc} and ${what}. The mutated code and the original produced identical test results when they should have diverged — a coverage divergence at the file's effective ${level} level (kill-floor ${KILL_FLOOR_BY_LEVEL[level]}). The engine reports the survivor; you decide whether to add the missing test.`,
    location: { file: outcome.file, line: outcome.line, column: outcome.column },
    remediation: {
      kind: 'instruction',
      description: 'Kill the surviving mutant by adding a test that distinguishes the original from the mutation.',
      steps: [
        `Open ${loc} and read the ${outcome.operator} site (\`${outcome.originalText}\`).`,
        `Add or strengthen a test that asserts the BEHAVIOUR this code produces, so that rewriting it to \`${outcome.mutatedText}\` makes the test fail.`,
        isNoCoverage
          ? `This site has NO covering test — write one (the mutant is no-coverage, the worst signal).`
          : `An existing test covers the site but passed on the mutation — its assertion is too weak (e.g. it asserts a type, not a value).`,
      ],
    },
  });
}

/**
 * Build the per-file score-RATCHET findings: for every file with both a measured
 * score and a committed baseline, a DROP below the baseline is a regression finding
 * at the file's effective level. The measured score is computed from the LIVE
 * outcomes (THE LAW — never a hardcoded expectation). A file with no baseline is
 * skipped here (its first measurement establishes the baseline; it is not a
 * regression).
 */
function ratchetFindings(facts: MutationFacts, levels: ReadonlyMap<string, AssuranceLevel>): readonly Finding[] {
  const measured = measuredScores(facts.outcomes);
  const findings: Finding[] = [];
  for (const file of [...measured.keys()].sort((a, b) => a.localeCompare(b))) {
    const baseline = facts.scoreBaseline[file];
    if (baseline === undefined) continue;
    const score = measured.get(file)!;
    if (score >= baseline) continue;
    const level = levelForFile(file, levels);
    findings.push(
      finding({
        ruleId: GATE_ID,
        severity: SURVIVOR_SEVERITY_BY_LEVEL[level],
        level,
        title: `Mutation score regressed for ${file} (${level})`,
        detail: `The measured mutation score for ${file} (${score.toFixed(4)}) DROPPED below its committed baseline (${baseline.toFixed(4)}) — the score ratchet only ever rises. A new survivor was introduced or a test was weakened. The engine reports the regression; you decide whether to restore the killed mutant or update the committed baseline upward.`,
        location: { file },
        remediation: {
          kind: 'instruction',
          description: 'Restore the mutation score to at least its committed baseline.',
          steps: [
            `Compare the surviving mutants for ${file} against the committed baseline ${baseline.toFixed(4)}.`,
            `Add the test(s) that kill the new survivors, OR — if the new survivors are genuinely acceptable — raise the committed baseline (never silently lower it).`,
          ],
        },
      }),
    );
  }
  return findings;
}

/**
 * Per-file measured mutation score (killed / non-equivalent total) over the live
 * outcomes. An `equivalent` mutant is EXCLUDED from BOTH the numerator and the
 * denominator: it is not a coverage gap (no test could ever observe it), so counting
 * it against the score would be a LIE (an unkillable mutant can never be killed, so it
 * would cap the score below 1.0 forever). The denominator is therefore the
 * non-equivalent mutants; a file whose every non-equivalent mutant is killed scores a
 * HONEST 1.0.
 */
function measuredScores(outcomes: readonly MutantOutcome[]): ReadonlyMap<string, number> {
  const killed = new Map<string, number>();
  const total = new Map<string, number>();
  for (const o of outcomes) {
    if (o.verdict === 'equivalent') continue; // excluded from the score denominator
    total.set(o.file, (total.get(o.file) ?? 0) + 1);
    if (o.verdict === 'killed') killed.set(o.file, (killed.get(o.file) ?? 0) + 1);
  }
  const scores = new Map<string, number>();
  for (const [file, t] of total) scores.set(file, t === 0 ? 1 : (killed.get(file) ?? 0) / t);
  return scores;
}

/**
 * The shared fold — folds the injected mutation facts. Each survived/no-coverage
 * mutant → a survivor finding at its file's effective level; each per-file score
 * drop → a ratchet finding. A `killed` mutant produces nothing (adequate coverage).
 * Findings are emitted in a deterministic order (sorted by location).
 */
function foldMutation(context: GateContext): readonly Finding[] {
  const facts = requireMutation(context, GATE_ID);
  const ir = requireIR(context, GATE_ID);
  const levels = effectiveLevels(ir);

  const survivors: Finding[] = [];
  for (const outcome of facts.outcomes) {
    // A `killed` mutant is adequate coverage; an `equivalent` mutant is a justified,
    // registry-recorded non-gap (no test could observe it). Neither is a finding.
    if (outcome.verdict === 'killed' || outcome.verdict === 'equivalent') continue;
    survivors.push(survivorFinding(outcome, levelForFile(outcome.file, levels)));
  }
  survivors.sort(
    (a, b) =>
      (a.location?.file ?? '').localeCompare(b.location?.file ?? '') ||
      (a.location?.line ?? 0) - (b.location?.line ?? 0) ||
      (a.location?.column ?? 0) - (b.location?.column ?? 0),
  );

  return [...survivors, ...ratchetFindings(facts, levels)];
}

// ── Fixtures (in-memory, no parse / no test run) ──────────────────────────────

/** A {@link GateContext} carrying an in-memory IR + mutation facts — for the fixtures. */
function mutationContext(ir: RepoIR, mutation: MutationFacts): GateContext {
  return { ...memoryContext({}), ir, mutation };
}

/** A fixtures-only L4 file id (matches the `core/.../brands.ts` L4 glob in the map). */
const L4_FILE = 'packages/core/src/schema/brands.ts';
/** A fixtures-only ordinary (L1) file id. */
const L1_FILE = 'packages/x/src/a.ts';

/** A literal IR carrying just the two fixture files (no imports → glob levels stand). */
function fixtureIR(): RepoIR {
  return makeRepoIR({
    files: [
      { id: L4_FILE, contentDigest: PLACEHOLDER_DIGEST, packageName: '@liteship/core' },
      { id: L1_FILE, contentDigest: PLACEHOLDER_DIGEST, packageName: null },
    ],
  });
}

/** A killed mutant outcome on the L4 file (adequate coverage). */
function killedOutcome(): MutantOutcome {
  return {
    mutantId: 'blake3:fixture-killed',
    verdict: 'killed',
    file: L4_FILE,
    line: 10,
    column: 5,
    operator: 'equality',
    originalText: '===',
    mutatedText: '!==',
  };
}

/** A surviving mutant outcome on the L4 file (a blocking divergence). */
function survivedL4Outcome(): MutantOutcome {
  return {
    mutantId: 'blake3:fixture-survived',
    verdict: 'survived',
    file: L4_FILE,
    line: 42,
    column: 9,
    operator: 'conditional-boundary',
    originalText: '>=',
    mutatedText: '>',
  };
}

/**
 * The red/green/mutation fixtures — the authority ratchet's evidence, all in-memory.
 *  - RED: facts carrying a SURVIVED L4 mutant → ≥1 finding (the gate catches the
 *    untested behaviour).
 *  - GREEN: facts carrying ONLY a KILLED L4 mutant, with the file's score at its
 *    committed baseline → 0 findings (adequate coverage, no regression).
 *  - MUTATION: a mutant gate that treats `killed` as a survivor (ignores the
 *    verdict) WRONGLY fires on the green fixture's killed mutant → green dirty →
 *    killed; AND treating survived as killed would empty the red fixture → also
 *    killed. Either way the fixtures have teeth.
 */
const FIXTURES = {
  red: {
    name: 'mutation facts with a SURVIVED L4 mutant (untested behaviour the gate must flag)',
    context: mutationContext(fixtureIR(), {
      outcomes: [survivedL4Outcome()],
      scoreBaseline: {},
    }),
  },
  green: {
    name: 'mutation facts with only a KILLED L4 mutant at its committed score baseline (adequate, no regression)',
    context: mutationContext(fixtureIR(), {
      outcomes: [killedOutcome()],
      // The file's measured score is 1.0 (1 killed / 1 total); the baseline is 1.0,
      // so there is no ratchet drop. A clean green.
      scoreBaseline: { [L4_FILE]: 1.0 },
    }),
  },
  mutation: {
    describe:
      "A mutant gate that ignores the verdict and reports EVERY mutant as a survivor fires on the green fixture's killed mutant — green is no longer clean and the mutant is killed.",
    mutate: (gate: Gate): Gate => ({
      ...gate,
      run: (context: GateContext): readonly Finding[] => {
        const facts = requireMutation(context, GATE_ID);
        const ir = requireIR(context, GATE_ID);
        const levels = effectiveLevels(ir);
        // The corruption: emit a finding for EVERY mutant (treats killed as survived).
        return facts.outcomes.map((o) => survivorFinding(o, levelForFile(o.file, levels)));
      },
    }),
  },
} as const;

/**
 * The mutation-divergence gate — each surviving / no-coverage mutant becomes a
 * self-explaining Finding at the file's propagated assurance level, the kill-floor
 * deciding blocking; a per-file score drop vs the committed baseline is a regression
 * finding. REPORT-not-DECIDE. It {@link requireMutation} + reads the IR, so it runs
 * only on the opt-in host path. Earns blocking authority via the existing ratchet.
 */
export const mutationDivergenceGate: Gate = defineGate({
  id: GATE_ID,
  level: 'L4',
  describe:
    "Reports each surviving or no-coverage mutant as a coverage divergence at the file's propagated assurance level (kill-floor by level decides blocking), plus a per-file mutation-score-ratchet regression. Folds host-injected MutationFacts. Reports, never decides.",
  run: foldMutation,
  // OUT-OF-IR evidence: the injected MutationFacts come from EXTERNAL per-mutant vitest
  // runs (a mutant flips killed→survived when a confirmer test is weakened) — NOT from
  // any IR source byte. Fold the fact content so the cache refolds on a verdict flip
  // even when the IR source is byte-identical (the soundness keystone for this gate).
  evidenceDigest: (context: GateContext): string | undefined => factAccessEvidenceDigest('mutation', context.mutation),
  fixtures: FIXTURES,
});
