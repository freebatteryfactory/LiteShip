/**
 * The MC/DC-COVERAGE gate (the avionics tier — DO-178B Level A's Modified
 * Condition/Decision Coverage, realized as condition-level mutation). The lean half: it
 * FOLDS the host-injected {@link McdcFacts} into self-explaining {@link Finding}s, the
 * same REPORT-not-DECIDE shape the mutation-divergence gate uses.
 *
 * THE BIG IDEA, restated as a gate. MC/DC requires each ATOMIC boolean CONDITION in a
 * decision to be shown to INDEPENDENTLY affect the decision's outcome. The
 * condition-mutation realization (see `@liteship/audit`'s `mcdc-engine.ts`): for each atomic
 * condition the host mints two pins — force the condition TRUE, and separately FALSE —
 * and runs the covering tests on each. A condition's independent effect is OBSERVED iff
 * BOTH pins are KILLED ({@link isMcdcCovered}); a SURVIVING or NO-COVERAGE pin is an
 * MC/DC GAP. So each uncovered condition becomes a Finding at the file's EFFECTIVE
 * assurance level (the {@link propagateAssuranceLevels} fixpoint over the IR's import
 * graph, NOT the raw glob level — a helper pulled into an L4 path inherits L4), carrying
 * the decision + the condition + which pin(s) failed (so the dev/agent sees EXACTLY what
 * is unobserved). A fully-covered condition (both pins killed) produces no finding.
 *
 * AIM THE CANNON (the MC/DC floor by level). L4 — the avionics trust spine — requires
 * FULL MC/DC: every condition's independent effect must be observed, so an uncovered L4
 * condition BLOCKS (`error`). Lower levels are advisory debt (calibrating):
 *   - L4 uncovered condition → `error` (BLOCKS — DO-178B Level A demands full MC/DC).
 *   - L3 uncovered condition → `error` (deterministic runtime paths — held to MC/DC too).
 *   - L2 uncovered condition → `warning`.
 *   - L1/L0 uncovered condition → `advisory` (sampled debt — calibrating).
 * A NO-COVERAGE condition (no test covers the decision at all) is one severity-step
 * LOUDER than a partial gap at the same level (it is the worse signal), clamped at
 * `error` — exactly the mutation-divergence no-coverage calibration.
 *
 * REPORT-not-DECIDE. The gate names the uncovered condition, its decision, its level, and
 * which pin survived, and reports it; the human/agent decides whether to write the
 * missing distinguishing test. The engine picks no winner. THE LAW (the head-probe scar):
 * the effective level is computed from the LIVE IR's propagation fixpoint, never a
 * hardcoded level beside the file.
 *
 * It {@link requireMcdc} (and reads the IR for level propagation), so it runs ONLY on the
 * opt-in host path (`liteship check gates --ir --mcdc` — the CLI generates the condition-mutants +
 * runs the per-pin suites + injects the facts); the lean MCP/command path does not run
 * it. Composition over inheritance: a `_tag`-free fold over the folded outcomes +
 * standalone functions, no class.
 *
 * @module
 */

import { defineGate, requireMcdc, requireIR, type GateContext, type Gate } from '../gate.js';
import { factAccessEvidenceDigest } from '../verdict-cache.js';
import { finding, type Finding, type Severity } from '../finding.js';
import { memoryContext } from '../engine.js';
import { makeRepoIR, PLACEHOLDER_DIGEST, type RepoIR } from '../repo-ir.js';
import { levelOf } from '../assurance-map.js';
import { propagateAssuranceLevels } from '../assurance-propagation.js';
import type { AssuranceLevel } from '../assurance.js';
import { isMcdcCovered, type McdcFacts, type McdcConditionOutcome, type McdcPinVerdict } from '../facts/mcdc-facts.js';

/** The gate id — namespaces every finding (traceability). */
const GATE_ID = 'gauntlet/mcdc-coverage';

/**
 * The severity an UNCOVERED condition earns at a given effective level — the MC/DC-floor
 * calibration, exported DATA a downstream owner can redline (sibling to the
 * mutation-divergence kill-floor matrix). L4/L3 BLOCK (DO-178B Level A demands full
 * MC/DC); L2 warns; L1/L0 are advisory debt.
 */
export const MCDC_SEVERITY_BY_LEVEL: Readonly<Record<AssuranceLevel, Severity>> = {
  L4: 'error',
  L3: 'error',
  L2: 'warning',
  L1: 'advisory',
  L0: 'advisory',
} as const;

/**
 * The MC/DC COVERAGE FLOOR (minimum acceptable covered-condition fraction) per level —
 * the blocking target. L4 = 1.0 (FULL MC/DC: every condition's independent effect
 * observed); lower levels descend. Redlinable DATA, sibling to KILL_FLOOR_BY_LEVEL.
 */
export const MCDC_FLOOR_BY_LEVEL: Readonly<Record<AssuranceLevel, number>> = {
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
 * The EFFECTIVE level of every file — the {@link propagateAssuranceLevels} fixpoint over
 * the live IR's import graph, with the glob {@link levelOf} as the floor (THE LAW:
 * computed from the live IR, never a hardcoded level). A file not in the IR (a fixture's
 * bare file table) falls back to its glob level directly.
 */
function effectiveLevels(ir: RepoIR): ReadonlyMap<string, AssuranceLevel> {
  return propagateAssuranceLevels(ir, (file) => levelOf(file));
}

/** The effective level of one file — the propagated map, or the glob floor if absent. */
function levelForFile(file: string, levels: ReadonlyMap<string, AssuranceLevel>): AssuranceLevel {
  return levels.get(file) ?? levelOf(file);
}

/** Is the WHOLE condition uncovered (no test covers the decision — both pins no-coverage)? */
function isNoCoverage(outcome: McdcConditionOutcome): boolean {
  return outcome.forceTrueVerdict === 'no-coverage' && outcome.forceFalseVerdict === 'no-coverage';
}

/** A short human description of which pin(s) failed to be killed — the unobserved effect(s). */
function gapDescription(outcome: McdcConditionOutcome): string {
  const parts: string[] = [];
  if (outcome.forceTrueVerdict !== 'killed') {
    parts.push(`force-TRUE (${pinWord(outcome.forceTrueVerdict, outcome.forceTrueInconclusiveReason)})`);
  }
  if (outcome.forceFalseVerdict !== 'killed') {
    parts.push(`force-FALSE (${pinWord(outcome.forceFalseVerdict, outcome.forceFalseInconclusiveReason)})`);
  }
  return parts.join(' and ');
}

/** A human word for a pin verdict tag (for the finding prose). */
function pinWord(verdict: McdcPinVerdict, inconclusiveReason: string | null): string {
  if (verdict === 'survived') return 'survived — no test distinguished this value';
  if (verdict === 'no-coverage') return 'no covering test';
  // Name the ACTUAL refusal (PR #192 review, round 4): a timeout, a spawn
  // failure, and a zero-test run demand different responses — a generic
  // "infra fault" label made every refusal look the same.
  if (verdict === 'inconclusive') {
    return `inconclusive — the runner refused a trustworthy verdict (${inconclusiveReason ?? 'unrecorded infra fault'})`;
  }
  return 'killed';
}

/**
 * Build the self-explaining finding for one UNCOVERED condition. Names the decision, the
 * atomic condition, which pin(s) were not killed, the location, and the effective level;
 * severity is the MC/DC-floor calibration (a fully-uncovered condition is one step louder
 * than a partial gap at the same level). REPORT-not-DECIDE: the remediation is "write the
 * distinguishing test", the reader acts.
 */
function requiredCampaigns(facts: McdcFacts, file: string): readonly string[] {
  const row = facts.targetCensus.find((target) => target.file === file);
  return (row?.reasons ?? [])
    .filter((reason) => reason.kind === 'semantic-campaign' && reason.required.includes('mcdc'))
    .map((reason) => (reason.kind === 'semantic-campaign' ? reason.campaignId : ''))
    .sort((left, right) => left.localeCompare(right));
}

function uncoveredFinding(
  outcome: McdcConditionOutcome,
  level: AssuranceLevel,
  campaignIds: readonly string[] = [],
): Finding {
  const noCoverage = isNoCoverage(outcome);
  const hasInconclusive = outcome.forceTrueVerdict === 'inconclusive' || outcome.forceFalseVerdict === 'inconclusive';
  const base = MCDC_SEVERITY_BY_LEVEL[level];
  const severity = campaignIds.length > 0 ? 'error' : noCoverage ? louder(base) : base;
  const loc = `${outcome.file}:${outcome.line}:${outcome.column}`;
  const gaps = gapDescription(outcome);
  const campaignClause =
    campaignIds.length > 0
      ? ` Semantic campaign(s) ${campaignIds.join(', ')} independently require MC/DC closure for this public runtime path, so this finding blocks without relabeling the file's actual assurance level.`
      : '';
  // An inconclusive pin completed NO comparison (PR #192 review, round 5 — the
  // sibling of the mutation-divergence round-4 fix): claiming it "did not flip
  // any covering test" and demanding a distinguishing test pair are both lies
  // that send the reader away from the actual runner fault. Refusals get
  // refusal prose and infra remediation.
  if (hasInconclusive) {
    return finding({
      ruleId: GATE_ID,
      severity,
      level,
      title: `Condition MC/DC verdict inconclusive at ${loc} (${level})`,
      detail: `The atomic condition \`${outcome.condition}\` in the decision \`${outcome.decision}\` earned NO trustworthy MC/DC verdict: ${gaps}. No comparison was completed for the refused pin(s) — nothing is known about whether the suite observes this condition's independent effect, which is exactly why it cannot count as covered at the file's effective ${level} level (MC/DC floor ${MCDC_FLOOR_BY_LEVEL[level]}).${campaignClause} The engine reports the refusal; fix the runner fault, then let a clean re-run settle the verdict.`,
      location: { file: outcome.file, line: outcome.line, column: outcome.column },
      remediation: {
        kind: 'instruction',
        description: 'Resolve the runner fault and re-run the campaign so this condition earns a real MC/DC verdict.',
        steps: [
          `Read the refusal: ${gaps}.`,
          'Fix the infrastructure fault it names (a timeout budget, a spawn failure, a zero-test collection) — the test suite is not implicated by a refusal.',
          `Re-run \`liteship check gates --ir --mcdc\`: both pins of \`${outcome.condition}\` must settle to killed for the condition to count as MC/DC-covered.`,
        ],
      },
    });
  }
  const what = noCoverage
    ? `has NO covering test at all — its independent effect on the decision is entirely unobserved (not even a test that missed it)`
    : `is not MC/DC-covered: the pin(s) ${gaps} did not flip any covering test, so the suite never distinguishes this condition's value changing the decision's outcome`;
  return finding({
    ruleId: GATE_ID,
    severity,
    level,
    title: `Condition not MC/DC-covered at ${loc} (${level})`,
    detail: `The atomic condition \`${outcome.condition}\` in the decision \`${outcome.decision}\` ${what}. MC/DC (DO-178B Level A) requires each condition's independent effect to be observed — both its force-true and force-false condition-mutant must be KILLED by a covering test. Here ${gaps} survived, an MC/DC gap at the file's effective ${level} level (MC/DC floor ${MCDC_FLOOR_BY_LEVEL[level]}).${campaignClause} The engine reports the gap; you decide whether to add the missing distinguishing test.`,
    location: { file: outcome.file, line: outcome.line, column: outcome.column },
    remediation: {
      kind: 'instruction',
      description: 'Close the MC/DC gap by adding a test that shows this condition independently affects the decision.',
      steps: [
        `Open ${loc} and read the condition \`${outcome.condition}\` in \`${outcome.decision}\`.`,
        noCoverage
          ? `This decision has NO covering test — write one that exercises it (the worst signal: nothing observes the branch).`
          : `Add a test pair that holds the other conditions fixed and flips ONLY \`${outcome.condition}\`, asserting the decision's outcome flips with it (so pinning it to ${gaps} would make a test fail).`,
        `Re-run \`liteship check gates --ir --mcdc\`: both the force-true and force-false pins of \`${outcome.condition}\` must be killed for the condition to be MC/DC-covered.`,
      ],
    },
  });
}

/**
 * Build the per-file aggregate MC/DC floor findings from the host-owned target
 * census. The census is the denominator authority: counting only returned
 * outcomes would let a dropped condition make the measured fraction look better.
 */
function coverageFloorFindings(facts: McdcFacts, levels: ReadonlyMap<string, AssuranceLevel>): readonly Finding[] {
  const findings: Finding[] = [];
  for (const target of [...facts.targetCensus].sort((left, right) =>
    left.file < right.file ? -1 : left.file > right.file ? 1 : 0,
  )) {
    const outcomes = facts.conditions.filter((outcome) => outcome.file === target.file);
    const level = levelForFile(target.file, levels);
    if (
      !Number.isInteger(target.applicableConditions) ||
      target.applicableConditions < 0 ||
      outcomes.length > target.applicableConditions
    ) {
      findings.push(
        finding({
          ruleId: GATE_ID,
          severity: 'error',
          level,
          title: `MC/DC target census inconsistent for ${target.file} (${level})`,
          detail: `The MC/DC target census admits ${target.applicableConditions} condition(s) for ${target.file}, but the facts carry ${outcomes.length} outcome(s). An invalid or undercounted denominator cannot produce a trustworthy coverage fraction, so the gate refuses it instead of clamping or passing.`,
          location: { file: target.file },
          remediation: {
            kind: 'instruction',
            description: 'Repair the host-owned MC/DC target census and re-run the campaign.',
            steps: [
              'Fix the facts producer so applicableConditions is a non-negative integer and is at least the number of emitted outcomes.',
              'Re-run `liteship check gates --ir --mcdc`; the census and outcome set must agree before the floor can pass.',
            ],
          },
        }),
      );
      continue;
    }
    const covered = outcomes.filter(isMcdcCovered).length;
    const score = target.applicableConditions === 0 ? 1 : covered / target.applicableConditions;
    const floor = MCDC_FLOOR_BY_LEVEL[level];
    if (score >= floor) continue;
    const campaignIds = requiredCampaigns(facts, target.file);

    findings.push(
      finding({
        ruleId: GATE_ID,
        severity: campaignIds.length > 0 ? 'error' : MCDC_SEVERITY_BY_LEVEL[level],
        level,
        title: `MC/DC coverage below floor for ${target.file} (${level})`,
        detail: `The per-file MC/DC covered-condition fraction for ${target.file} is ${score.toFixed(4)} (${covered}/${target.applicableConditions}), BELOW the effective ${level} floor ${floor.toFixed(4)}. The denominator comes from the host-owned target census, so a condition that was admitted but did not earn a covered verdict cannot disappear from the measurement.${campaignIds.length > 0 ? ` Semantic campaign(s) ${campaignIds.join(', ')} require MC/DC closure for this target.` : ''}`,
        location: { file: target.file },
        remediation: {
          kind: 'instruction',
          description: `Raise ${target.file}'s MC/DC coverage to at least ${floor.toFixed(4)}.`,
          steps: [
            `Inspect the uncovered condition findings for ${target.file}; ${target.applicableConditions - covered} of ${target.applicableConditions} admitted conditions are not covered.`,
            'Add distinguishing tests until both the force-true and force-false pins are killed for enough conditions to clear the floor.',
            'Re-run `liteship check gates --ir --mcdc` and confirm the aggregate fraction clears the floor.',
          ],
        },
      }),
    );
  }
  return findings;
}

/**
 * The shared fold — folds the injected MC/DC facts. Each UNCOVERED condition (not both
 * pins killed) → a finding at its file's effective level; each target whose aggregate
 * covered-condition fraction is below its effective-level floor → one aggregate
 * finding. A fully-covered target produces nothing. Findings are deterministic.
 */
function foldMcdc(context: GateContext): readonly Finding[] {
  const facts = requireMcdc(context, GATE_ID);
  const ir = requireIR(context, GATE_ID);
  const levels = effectiveLevels(ir);

  const findings: Finding[] = [];
  for (const outcome of facts.conditions) {
    if (isMcdcCovered(outcome)) continue; // both pins killed — the independent effect is observed
    findings.push(
      uncoveredFinding(outcome, levelForFile(outcome.file, levels), requiredCampaigns(facts, outcome.file)),
    );
  }
  findings.sort(
    (a, b) =>
      (a.location?.file ?? '').localeCompare(b.location?.file ?? '') ||
      (a.location?.line ?? 0) - (b.location?.line ?? 0) ||
      (a.location?.column ?? 0) - (b.location?.column ?? 0),
  );
  return [...findings, ...coverageFloorFindings(facts, levels)];
}

// ── Fixtures (in-memory, no parse / no test run) ──────────────────────────────

/** A {@link GateContext} carrying an in-memory IR + MC/DC facts — for the fixtures. */
function mcdcContext(ir: RepoIR, mcdc: McdcFacts): GateContext {
  return { ...memoryContext({}), ir, mcdc };
}

/** A fixtures-only L4 file id (matches the `core/.../brands.ts` L4 glob in the map). */
const L4_FILE = 'packages/core/src/schema/brands.ts';

/** A literal IR carrying just the L4 fixture file (no imports → glob levels stand). */
function fixtureIR(): RepoIR {
  return makeRepoIR({
    files: [{ id: L4_FILE, contentDigest: PLACEHOLDER_DIGEST, packageName: '@liteship/core' }],
  });
}

/** A fully MC/DC-COVERED condition on the L4 file (both pins killed — no finding). */
function coveredCondition(): McdcConditionOutcome {
  return {
    conditionId: 'blake3:fixture-covered',
    file: L4_FILE,
    line: 10,
    column: 7,
    decision: 'a && b',
    condition: 'a',
    forceTrueVerdict: 'killed',
    forceFalseVerdict: 'killed',
    forceTrueInconclusiveReason: null,
    forceFalseInconclusiveReason: null,
    coveringTests: ['tests/fixture.test.ts'],
  };
}

/** An UNCOVERED condition on the L4 file (the force-false pin survived — a blocking gap). */
function uncoveredCondition(): McdcConditionOutcome {
  return {
    conditionId: 'blake3:fixture-uncovered',
    file: L4_FILE,
    line: 42,
    column: 9,
    decision: 'x >= lo && x <= hi',
    condition: 'x <= hi',
    forceTrueVerdict: 'killed',
    forceFalseVerdict: 'survived',
    forceTrueInconclusiveReason: null,
    forceFalseInconclusiveReason: null,
    coveringTests: ['tests/fixture.test.ts'],
  };
}

/**
 * The red/green/mutation fixtures — the authority ratchet's evidence, all in-memory.
 *  - RED: facts carrying an UNCOVERED L4 condition (a surviving pin) → ≥1 finding (the
 *    gate catches the unobserved independent effect).
 *  - GREEN: facts carrying ONLY a fully-COVERED L4 condition (both pins killed) → 0
 *    findings (full MC/DC, nothing to report).
 *  - MUTATION: a gate that ignores the pin verdicts and reports EVERY condition as
 *    uncovered fires on the green fixture's covered condition → green is no longer clean
 *    → the mutant is killed; AND treating uncovered as covered would empty the red
 *    fixture → also killed. Either way the fixtures have teeth.
 */
const FIXTURES = {
  red: {
    name: 'MC/DC facts with an UNCOVERED L4 condition (a surviving pin — the unobserved effect the gate must flag)',
    context: mcdcContext(fixtureIR(), {
      conditions: [uncoveredCondition()],
      targetCensus: [{ file: L4_FILE, applicableConditions: 1, reasons: [] }],
    }),
  },
  green: {
    name: 'MC/DC facts with only a fully-COVERED L4 condition (both pins killed — full MC/DC, clean)',
    context: mcdcContext(fixtureIR(), {
      conditions: [coveredCondition()],
      targetCensus: [{ file: L4_FILE, applicableConditions: 1, reasons: [] }],
    }),
  },
  mutation: {
    describe:
      "A gate that ignores the pin verdicts and reports EVERY condition as uncovered fires on the green fixture's fully-covered condition — green is no longer clean and the mutant is killed.",
    mutate: (gate: Gate): Gate => ({
      ...gate,
      run: (context: GateContext): readonly Finding[] => {
        const facts = requireMcdc(context, GATE_ID);
        const ir = requireIR(context, GATE_ID);
        const levels = effectiveLevels(ir);
        // The corruption: emit a finding for EVERY condition (treats covered as uncovered).
        return facts.conditions.map((c) => uncoveredFinding(c, levelForFile(c.file, levels)));
      },
    }),
  },
} as const;

/**
 * The MC/DC-coverage gate — each uncovered atomic condition (its independent effect not
 * observed by the suite — a surviving force-true/force-false pin) becomes a
 * self-explaining Finding at the file's PROPAGATED assurance level, the MC/DC floor by
 * level deciding blocking (L4 demands FULL MC/DC — DO-178B Level A). Folds host-injected
 * McdcFacts. REPORT-not-DECIDE. It {@link requireMcdc} + reads the IR, so it runs only on
 * the opt-in host path. Earns blocking authority via the existing ratchet.
 */
export const mcdcCoverageGate: Gate = defineGate({
  id: GATE_ID,
  level: 'L4',
  describe:
    "Reports each atomic condition whose independent effect is NOT MC/DC-observed (a surviving force-true/force-false condition-mutant) as a coverage gap at the file's propagated assurance level (MC/DC floor by level decides blocking; L4 requires full MC/DC — DO-178B Level A). Folds host-injected McdcFacts. Reports, never decides.",
  run: foldMcdc,
  // OUT-OF-IR evidence: the injected McdcFacts come from EXTERNAL per-pin vitest runs
  // (a condition's pin flips killed→survived when its covering test weakens), NOT from
  // any IR source byte. Fold the fact content so the cache refolds on a pin-verdict flip
  // even when the IR source is byte-identical (the soundness keystone for this gate).
  evidenceDigest: (context: GateContext): string | undefined => factAccessEvidenceDigest('mcdc', context.mcdc),
  fixtures: FIXTURES,
});
