/**
 * The TRANSITION-CONFORMANCE gate (Wave 5.5, the transition cage — the capstone of
 * the constitution's BISIMULATION half). The lean fold: it FOLDS the host-injected
 * {@link TransitionFacts} into self-explaining {@link Finding}s, the same
 * REPORT-not-DECIDE shape the oracle-divergence + mutation-divergence gates use.
 *
 * THE BIG IDEA, restated as a gate (constitution §3, Axiom 4). A reactive primitive is
 * a COALGEBRA observed by the trace it unfolds over an operation history. Its fidelity
 * against the SINGLE ORACLE (the `fc.commands` model DERIVED from the CellKernel/
 * Lifetime law tables — LS-001) is a BISIMULATION: the two transports driven over ONE
 * op history must produce observationally-equivalent traces. So each `divergent` case
 * (the model and the implementation produced DIFFERENT observation digests for the
 * same seeded history) becomes a Finding at the family's assurance level, carrying the
 * SEED + the traceDigest + the `modelObs`→`implObs` digests (so the dev/agent replays
 * EXACTLY the history that diverged). An `equivalent` case is conformant coverage — no
 * finding. An `unevidenced` case (a witness-missing case — Axiom 4 keeps it SEPARATE
 * from divergence) is a coverage gap the gate surfaces, floored by the committed
 * unevidenced ratchet.
 *
 * AIM THE CANNON (severity by family level). The severity of a divergence scales with
 * the family's effective level (the reactive kernels are the trust spine → L4):
 *   - L4/L3 divergence → `error` (BLOCKS — a trust-spine transition that changed
 *     observable behavior is not admissible without a deliberate contract re-pin).
 *   - L2 divergence → `warning`.
 *   - L1/L0 divergence → `advisory` (calibrating).
 * An `unevidenced` case is `advisory` while the family's unevidenced count sits AT or
 * BELOW its committed baseline (calibrating debt); it escalates to the family's
 * severity-by-level (BLOCKS at L4) once the count RISES above the baseline — the
 * monotone ratchet: the number of unevidenced cases may only ever fall.
 *
 * REPORT-not-DECIDE. The gate names the divergence, its family + level, the seed, and
 * the two observation digests, and reports it; the human/agent — or Wave 6's DELIBERATE
 * EmissionPolicy choice — decides whether the divergence is a bug to fix or a behavior
 * to re-pin as a product law. The engine picks no winner (S1.5.3: capture-not-conclude,
 * lifted to the gate).
 *
 * It {@link requireTransition}, so it runs ONLY when a host injects the facts. The reference
 * model + native-transport oracle are LiteShip-local (product machinery in the test tree), so
 * — per ADR-0012/0023 — the host is the repo-local `transition:gate` phase
 * (`scripts/transition-conformance-gate.ts`, run every PR over the shared
 * `tests/support/reactive-conformance.ts` runner), NOT the shipped `liteship check` CLI; the lean
 * MCP/command path does not run it. Composition over inheritance: a `status` fold +
 * standalone functions, no class. Earns blocking authority via the SHIPPED ratchet
 * ({@link verifyGate}: redCaught ∧ greenClean ∧ mutationKilled — Axiom 5).
 *
 * @module
 */

import { defineGate, requireTransition, type GateContext, type Gate } from '../gate.js';
import { finding, type Finding, type Severity } from '../finding.js';
import { memoryContext } from '../engine.js';
import { factAccessEvidenceDigest } from '../verdict-cache.js';
import type { AssuranceLevel } from '../assurance.js';
import type { TransitionFacts, TransitionCase } from '../transition-facts.js';

/** The gate id — namespaces every finding (traceability). */
const GATE_ID = 'gauntlet/transition-conformance';

/**
 * The severity a DIVERGENCE earns at a given family level — the same calibration ladder
 * the mutation gate's SURVIVOR_SEVERITY_BY_LEVEL uses, exported DATA a downstream owner
 * can redline. L4/L3 divergences BLOCK; L2 warns; L1/L0 are advisory debt.
 */
export const DIVERGENCE_SEVERITY_BY_LEVEL: Readonly<Record<AssuranceLevel, Severity>> = {
  L4: 'error',
  L3: 'error',
  L2: 'warning',
  L1: 'advisory',
  L0: 'advisory',
} as const;

/**
 * The conformance-family → assurance-level map — exported, owner-redlinable DATA (the
 * sibling of the mutation kill-floor matrix). The Wave 5.5 reactive kernels are the
 * trust spine, so every reactive family resolves L4. A family ABSENT from the map
 * defaults to L4 (`levelForFamily`): the SAFE direction for a conformance cage
 * (an unclassified bisimulation family is treated as trust-spine — blocking — rather
 * than silently advisory, the same over-approximation discipline the mutation coverage
 * model uses).
 */
export const TRANSITION_FAMILY_LEVEL: Readonly<Record<string, AssuranceLevel>> = {
  cell: 'L4',
  derived: 'L4',
  store: 'L4',
  signal: 'L4',
  timeline: 'L4',
  'live-cell': 'L4',
  'reactive-replay1': 'L4',
  'reactive-fanout': 'L4',
} as const;

/** The effective level of a conformance family — the map entry, or the L4 fail-safe default. */
function levelForFamily(family: string): AssuranceLevel {
  return TRANSITION_FAMILY_LEVEL[family] ?? 'L4';
}

/** Count the `unevidenced` cases in a facts bundle — the ratchet's measured value. */
function unevidencedCount(cases: readonly TransitionCase[]): number {
  return cases.reduce((n, c) => (c.status === 'unevidenced' ? n + 1 : n), 0);
}

/**
 * Build the self-explaining finding for one DIVERGENT case. Names the family, the
 * seed, the traceDigest, and the two observation digests (so the reader replays the
 * exact history), at the family's severity-by-level. REPORT-not-DECIDE: the remediation
 * is "replay the seed and decide bug-vs-re-pin", the reader acts.
 */
function divergenceFinding(family: string, c: TransitionCase, level: AssuranceLevel): Finding {
  const severity = DIVERGENCE_SEVERITY_BY_LEVEL[level];
  return finding({
    ruleId: GATE_ID,
    severity,
    level,
    title: `Transition divergence in ${family} at seed ${c.seed} (${level})`,
    detail: `At seed \`${c.seed}\`, over the op history \`${c.traceDigest}\` (${c.operationCount} operations), the single-oracle model and the implementation produced DIFFERENT observations — model \`${c.modelObservationDigest}\` vs implementation \`${c.implementationObservationDigest}\`. The bisimulation relation FAILED: the transport changed observable behavior for the same history — a coverage divergence at the family's effective ${level} level. The engine reports the divergence with its replayable seed \`${c.seed}\`; you decide whether it is a bug to fix or a contract to re-pin (Wave 6's deliberate EmissionPolicy choice).`,
    remediation: {
      kind: 'instruction',
      description:
        'Resolve the transition divergence: replay the seed, then fix the transport OR deliberately re-pin the contract.',
      steps: [
        `Replay the op history for family "${family}" at seed ${c.seed} (traceDigest ${c.traceDigest}) against BOTH the model and the implementation.`,
        `Compare the observations byte-for-byte (model ${c.modelObservationDigest} vs implementation ${c.implementationObservationDigest}) to see exactly which delivery/order/emission differs.`,
        `If the model is right, fix the implementation to restore the bisimulation; if the divergence is a deliberate behavior (e.g. a chosen EmissionPolicy arm), re-pin the model + record the choice as the new product law (never silently accept the divergence).`,
      ],
    },
  });
}

/**
 * Build the finding for one UNEVIDENCED case — a witness-missing case (Axiom 4:
 * SEPARATE from divergence). Its severity is `advisory` while the family's unevidenced
 * count sits at/below the committed baseline (calibrating debt), and escalates to the
 * family's severity-by-level once the count rises above the baseline (the ratchet).
 * `escalated` decides which arm.
 */
function unevidencedFinding(family: string, c: TransitionCase, level: AssuranceLevel, escalated: boolean): Finding {
  const severity: Severity = escalated ? DIVERGENCE_SEVERITY_BY_LEVEL[level] : 'advisory';
  return finding({
    ruleId: GATE_ID,
    severity,
    level,
    title: `Transition unevidenced in ${family} at seed ${c.seed} (${level})`,
    detail: `At seed \`${c.seed}\`, the op history \`${c.traceDigest}\` (${c.operationCount} operations) produced NO comparable observation on at least one oracle side (a construction fault, an unsupported op, or a missing trace) — so the bisimulation could not be evidenced for this seed. This is a coverage GAP, kept SEPARATE from a divergence (an absent witness is not a fidelity claim). ${escalated ? 'The family’s unevidenced count ROSE above its committed baseline — a regression the ratchet BLOCKS (the count may only ever fall).' : 'It sits at or below the committed baseline, so it is reported as calibrating debt, not a regression.'} The engine reports the gap with its replayable seed \`${c.seed}\`; you decide how to evidence it.`,
    remediation: {
      kind: 'instruction',
      description: 'Evidence the unevidenced transition case (or ratchet the baseline down as gaps are closed).',
      steps: [
        `Replay the op history for family "${family}" at seed ${c.seed} and observe why one oracle side produced no trace (construction throw / unsupported op / drained-empty).`,
        `Make the case evidenceable (support the op, or catch + record the construction fault as a captured behavior), so both sides yield a comparable observation.`,
        escalated
          ? `The unevidenced count regressed above the committed baseline — restore it by evidencing the new gap(s), never by silently raising the baseline.`
          : `As gaps are closed, lower the committed unevidenced baseline (the ratchet only ever tightens).`,
      ],
    },
  });
}

/**
 * The shared fold — folds the injected transition facts. Each `divergent` case → a
 * divergence finding at the family's level; each `unevidenced` case → an unevidenced
 * finding (advisory below the baseline, escalated above it). An `equivalent` case
 * produces nothing (conformant coverage). Findings are emitted in a deterministic order
 * (sorted by status then seed).
 */
function foldTransition(context: GateContext): readonly Finding[] {
  const facts = requireTransition(context, GATE_ID);
  const level = levelForFamily(facts.family);
  // The unevidenced ratchet: the count regresses when it RISES above the committed
  // baseline. A family with NO committed baseline is a first measurement — never a
  // regression (its cases stay advisory), exactly as the mutation score-ratchet treats
  // a file absent from the baseline.
  const measuredUnevidenced = unevidencedCount(facts.cases);
  const escalatedUnevidenced =
    facts.unevidencedBaseline !== undefined && measuredUnevidenced > facts.unevidencedBaseline;

  const findings: Finding[] = [];
  for (const c of facts.cases) {
    if (c.status === 'equivalent') continue; // the bisimulation held — conformant, no finding
    if (c.status === 'divergent') {
      findings.push(divergenceFinding(facts.family, c, level));
    } else {
      findings.push(unevidencedFinding(facts.family, c, level, escalatedUnevidenced));
    }
  }
  // Deterministic order: divergences before unevidenced, then by seed (stable reports).
  const statusRank = (f: Finding): number => (f.title.includes('divergence') ? 0 : 1);
  findings.sort((a, b) => statusRank(a) - statusRank(b) || a.title.localeCompare(b.title));
  return findings;
}

// ── Fixtures (in-memory, no primitive / no capture) ───────────────────────────

/** A {@link GateContext} carrying in-memory transition facts — for the fixtures. */
function transitionContext(facts: TransitionFacts): GateContext {
  return { ...memoryContext({}), transition: facts };
}

/** A fixtures-only reactive family id (resolves L4 via {@link TRANSITION_FAMILY_LEVEL}). */
const CELL_FAMILY = 'cell';

/** A DIVERGENT case — the two observation digests DIFFER (a blocking L4 finding). */
function divergentCase(seed: string): TransitionCase {
  return {
    seed,
    traceDigest: 'sha256:deadbeef',
    operationCount: 4,
    modelObservationDigest: 'sha256:00000001',
    implementationObservationDigest: 'sha256:00000002',
    status: 'divergent',
  };
}

/** An EQUIVALENT case — the two observation digests AGREE (conformant, no finding). */
function equivalentCase(seed: string): TransitionCase {
  return {
    seed,
    traceDigest: 'sha256:cafebabe',
    operationCount: 4,
    modelObservationDigest: 'sha256:0000abcd',
    implementationObservationDigest: 'sha256:0000abcd',
    status: 'equivalent',
  };
}

/**
 * The red/green/mutation fixtures — the authority ratchet's evidence, all in-memory.
 *  - RED: facts carrying a DIVERGENT cell case → ≥1 finding (the gate catches the
 *    transport-changed behavior).
 *  - GREEN: facts carrying ONLY an EQUIVALENT cell case (bisimulation held), no
 *    unevidenced gap → 0 findings (conformant coverage).
 *  - MUTATION: a gate that reports a finding for EVERY case (ignores the `status`
 *    verdict, treating an `equivalent` case as divergent) WRONGLY fires on the green
 *    fixture's equivalent case → green dirty → killed.
 */
const FIXTURES = {
  red: {
    name: 'transition facts with a DIVERGENT cell case (a transport-changed behavior the gate must flag)',
    context: transitionContext({
      family: CELL_FAMILY,
      modelDigest: 'sha256:100d0000',
      implementationDigest: 'sha256:1e100000',
      cases: [divergentCase('0xred')],
      operationCoverage: { subscribe: 1, set: 1, read: 1, dispose: 1 },
    }),
  },
  green: {
    name: 'transition facts with only an EQUIVALENT cell case (the bisimulation held — conformant, no gap)',
    context: transitionContext({
      family: CELL_FAMILY,
      modelDigest: 'sha256:100d0000',
      implementationDigest: 'sha256:1e100000',
      cases: [equivalentCase('0xgreen')],
      operationCoverage: { subscribe: 1, set: 1, read: 1, dispose: 1 },
    }),
  },
  mutation: {
    describe:
      "A gate that ignores the status verdict and reports EVERY case as a divergence fires on the green fixture's equivalent case — green is no longer clean and the mutant is killed.",
    mutate: (gate: Gate): Gate => ({
      ...gate,
      run: (context: GateContext): readonly Finding[] => {
        const facts = requireTransition(context, GATE_ID);
        const level = levelForFamily(facts.family);
        // The corruption: emit a finding for EVERY case (treats equivalent as divergent).
        return facts.cases.map((c) => divergenceFinding(facts.family, c, level));
      },
    }),
  },
} as const;

/**
 * The transition-conformance gate — each `divergent` bisimulation case becomes a
 * self-explaining, REPLAYABLE Finding at the family's assurance level (severity by
 * level deciding blocking); each `unevidenced` case is a coverage gap floored by the
 * committed ratchet. REPORT-not-DECIDE. It {@link requireTransition}, so it runs only when a
 * host injects the facts — the repo-local `transition:gate` phase
 * (`scripts/transition-conformance-gate.ts`), NOT the shipped `liteship check` CLI. Earns
 * blocking authority via the shipped ratchet.
 */
export const transitionConformanceGate: Gate = defineGate({
  id: GATE_ID,
  level: 'L4',
  describe:
    "Reports each divergent bisimulation case (the single-oracle model and the implementation disagree over one op history) as a replayable coverage divergence at the family's assurance level, plus each unevidenced case as a coverage gap floored by the committed ratchet. Folds host-injected TransitionFacts. Reports, never decides.",
  run: foldTransition,
  // OUT-OF-IR evidence: the injected TransitionFacts come from EXTERNAL primitive
  // capture runs (a case flips equivalent→divergent when the transport's behavior
  // changes) — NOT from any IR source byte. Fold the fact content so the cache refolds
  // on a verdict flip even when the IR source is byte-identical (the soundness keystone).
  evidenceDigest: (context: GateContext): string | undefined =>
    factAccessEvidenceDigest('transition', context.transition),
  fixtures: FIXTURES,
});
