/**
 * Gate: simulation-determinism — the avionics-tier (L4) fold over host-supplied
 * {@link SimulationFacts}, the DETERMINISTIC SIMULATION TESTING (DST) verdict.
 *
 * Determinism is the trust spine: the whole assurance case rests on "the same
 * input yields the same artifact run-to-run". The DST harness
 * (`@liteship/core/simulation`) PROVES that for a scenario by replaying it twice from
 * one seed and content-addressing the two byte-exact traces. If the two digests
 * DIVERGE, the system-under-test read real time / real randomness OUTSIDE the
 * world's injected substrate (or has an ordering bug) — a cardinal determinism
 * failure. This gate folds that divergence into a self-explaining L4 Finding,
 * carrying the SEED so the bug replays byte-for-byte (the FoundationDB property).
 *
 * REPORT-not-DECIDE: a divergence finding names the scenario, the seed, the two
 * disagreeing digests, and the first point the traces parted — the engine picks
 * no winner; the reader (or an agent) acts on the seed. The gate NEVER re-runs the
 * harness or re-derives determinism — the HOST (the CLI `--simulate` path) ran the
 * corpus and decided; the gate only folds the already-decided facts (ADR-0012, the
 * same lean pattern as {@link supplyChainGate}).
 *
 * LEAN BY CONSTRUCTION: the gate mints no world, runs no scenario, addresses no
 * trace, and imports nothing from the DST harness. An ABSENT facts record is an
 * HONEST advisory "not-evidenced" finding (never a silent green) — a host that
 * supplied no simulation facts gets one advisory, surfacing the under-coverage.
 *
 * It ships red / green / mutation fixtures, so it self-proves against the
 * authority ratchet and earns blocking authority.
 *
 * @module
 */

import { defineGate, type GateContext, type Gate } from '../gate.js';
import { factAccessEvidenceDigest } from '../verdict-cache.js';
import { finding, type Finding } from '../finding.js';
import { memoryContext } from '../engine.js';
import type { ScenarioReplayFact, SimulationFacts } from '../simulation-facts.js';

const RULE_NS = 'gauntlet/simulation-determinism';

/**
 * Project one diverged scenario into an error Finding at the avionics level. The
 * seed and both digests are woven into the detail so the bug is reproducible from
 * the finding alone — `replay(seed, scenario)` re-runs it byte-for-byte.
 */
function divergenceFinding(run: ScenarioReplayFact): Finding {
  // Present only for a diverged run (the caller guards), but read defensively so
  // the projection never assumes a field the type marks optional.
  const where = run.divergence?.firstDivergentLabel ?? null;
  const why = run.divergence?.detail ?? 'two replays of the same seed produced different trace digests';
  const at = where === null ? 'in trace length/shape' : `at trace point \`${where}\``;
  return finding({
    ruleId: `${RULE_NS}/replay-divergence`,
    severity: 'error',
    level: 'L4',
    title: `Replay divergence in scenario "${run.scenarioId}" (seed ${run.seed})`,
    detail:
      `Two replays of scenario "${run.scenarioId}" from seed ${run.seed} produced DIFFERENT byte-exact trace digests ` +
      `(${run.firstDigest} ≠ ${run.secondDigest}), diverging ${at}. ${why}. ` +
      `This means the system-under-test read real time / real randomness OUTSIDE the world's injected clock/rng substrate, ` +
      `or has an ordering bug — determinism (the trust spine) is broken. The engine picks no winner; reproduce it with ` +
      `replay(${run.seed}, "${run.scenarioId}") through @liteship/core/simulation.`,
    location: { file: run.scenarioId },
    remediation: {
      kind: 'instruction',
      description: 'Restore deterministic replay — the same seed must yield a byte-identical trace.',
      steps: [
        `Reproduce: run \`replay(${run.seed}, "${run.scenarioId}")\` twice via @liteship/core/simulation; the trace digests must match.`,
        `Find the leak: at trace point ${where === null ? '(length/shape divergence)' : `\`${where}\``}, the SUT read an ambient source — replace every raw wall-clock read (Date-dot-now / argless new-Date) with the world's clock (world.clock / world.wallClock) and every raw random read (Math-dot-random) with the world's rng (world.rng).`,
        `Re-run the corpus through the host (\`liteship check --ir --simulate\`); the divergence must clear — it is a real nondeterminism bug, never waivable.`,
      ],
    },
  });
}

/** The advisory finding for absent DST evidence (honest under-coverage). */
function notEvidencedFinding(): Finding {
  return finding({
    ruleId: `${RULE_NS}/not-evidenced`,
    severity: 'advisory',
    level: 'L4',
    title: 'Simulation determinism not evidenced',
    detail:
      'No simulation (DST) facts were injected on the GateContext, so the gate cannot attest replay-determinism. ' +
      'This is honest under-coverage (advisory), never a silent pass — a host (the CLI `liteship check --ir --simulate` path) ' +
      'must run the scenario corpus through the @liteship/core/simulation harness and inject the verdicts via context.simulation.',
    remediation: {
      kind: 'instruction',
      description: 'Supply the DST facts so the avionics gate can attest replay-determinism.',
      steps: [
        'Run the scenario corpus through @liteship/core/simulation (replay each seed twice, content-address the traces).',
        'Inject the resulting SimulationFacts via the GateContext (context.simulation.runs).',
      ],
    },
  });
}

/** The fold: project the injected DST facts into Findings. */
function fold(context: GateContext): readonly Finding[] {
  const facts: SimulationFacts | undefined = context.simulation;
  // ABSENT facts OR an empty run set are both honest under-coverage: the gate
  // attested nothing, so it says so (advisory) rather than passing silently.
  if (facts === undefined || facts.runs === undefined || facts.runs.length === 0) {
    return [notEvidencedFinding()];
  }
  const findings: Finding[] = [];
  for (const run of facts.runs) {
    if (run.divergence !== undefined) {
      findings.push(divergenceFinding(run));
    }
  }
  return findings;
}

/** A GateContext carrying a literal SimulationFacts record (fixture helper). */
function factsContext(facts: SimulationFacts): GateContext {
  return { ...memoryContext({}), simulation: facts };
}

/** A clean corpus: every scenario replayed deterministically (agreeing digests). */
const CLEAN_FACTS: SimulationFacts = {
  runs: [
    {
      scenarioId: 'boundary-evaluate-sequence',
      seed: 1,
      firstDigest: 'fnv1a:0a0b0c0d',
      secondDigest: 'fnv1a:0a0b0c0d',
    },
    {
      scenarioId: 'graph-patch-apply',
      seed: 2,
      firstDigest: 'fnv1a:11223344',
      secondDigest: 'fnv1a:11223344',
    },
  ],
};

/** A corpus with one replay divergence — the determinism failure (the red). */
const DIVERGED_FACTS: SimulationFacts = {
  runs: [
    {
      scenarioId: 'boundary-evaluate-sequence',
      seed: 1,
      firstDigest: 'fnv1a:0a0b0c0d',
      secondDigest: 'fnv1a:0a0b0c0d',
    },
    {
      scenarioId: 'leaky-clock-read',
      seed: 1337,
      firstDigest: 'fnv1a:deadbeef',
      secondDigest: 'fnv1a:feedface',
      divergence: {
        firstDivergentLabel: 'sut.timestamp',
        detail:
          'step `sut.timestamp` observed a value derived from a raw wall-clock read (Date-dot-now) that bypassed the world wall clock, so the two replays read different wall times',
      },
    },
  ],
};

/** The qualified gate — fixtures included, so it self-proves via the ratchet. */
export const simulationDeterminismGate: Gate = defineGate({
  id: RULE_NS,
  level: 'L4',
  describe:
    'Avionics-tier fold over host-supplied DST (deterministic-simulation) facts: a replay-divergence (two replays of one seed produce different byte-exact trace digests) is a self-explaining L4 Finding carrying the seed — determinism is the trust spine.',
  run: fold,
  // OUT-OF-IR evidence: the injected SimulationFacts come from EXTERNAL seeded replay
  // runs (a scenario flips deterministic→divergent), NOT from any IR source byte. Fold
  // the fact content so the cache refolds on a divergence change even when the IR source
  // is byte-identical (the soundness keystone for this gate).
  evidenceDigest: (context: GateContext): string | undefined =>
    factAccessEvidenceDigest('simulation', context.simulation),
  fixtures: {
    red: {
      name: 'a corpus where one scenario diverges on replay (the SUT leaked an ambient clock read)',
      context: factsContext(DIVERGED_FACTS),
    },
    green: {
      name: 'a corpus where every scenario replays deterministically (agreeing digests, no divergence)',
      context: factsContext(CLEAN_FACTS),
    },
    mutation: {
      describe:
        'A gate that ignores the recorded divergence (folds only "not-evidenced") leaves the red corpus unflagged — the mutant must then fail the red.',
      mutate: (gate: Gate): Gate => ({
        ...gate,
        // Mutant: drop every divergence on the floor (a toothless fold that never
        // reports a real replay-divergence) — it must fail the red fixture.
        run: (context: GateContext): readonly Finding[] =>
          context.simulation === undefined ? [notEvidencedFinding()] : [],
      }),
    },
  },
});
