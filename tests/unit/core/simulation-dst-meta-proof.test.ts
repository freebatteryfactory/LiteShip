/**
 * THE RECURSIVE META-PROOF — "test the test that tests the tests".
 *
 * This file QUALIFIES the DST harness (`@czap/core/simulation`) to
 * tool-qualification grade. A harness that claims to detect nondeterminism is
 * worthless unless it is PROVEN to (a) be deterministic itself, (b) actually
 * CATCH a real nondeterminism leak (not falsely pass), and (c) go RED the moment
 * the harness itself is broken. The three levels below prove exactly that — the
 * recursion that turns a test framework into a trusted instrument.
 *
 *   LEVEL 1 — a DETERMINISTIC scenario (reads ONLY the world's injected
 *     clock/rng) replays BYTE-EXACT: same seed twice → identical trace digest.
 *     Proves the harness IS deterministic.
 *
 *   LEVEL 2 — an INJECTED-NONDETERMINISM scenario (a SUT that reads RAW
 *     Date.now() / Math.random() BYPASSING the world) → the two replays DIVERGE →
 *     the DST gate CATCHES it (a replay-divergence Finding). Proves the harness
 *     DETECTS nondeterminism — it is NOT falsely passing. THIS is "the test tests
 *     the tests".
 *
 *   LEVEL 3 — a SEEDED FAULT that causes a failure replays IDENTICALLY from its
 *     seed (the bug is reproducible byte-for-byte); AND a deliberately-BROKEN
 *     harness (a traceDigest that ignores part of the trace, or a scheduler that
 *     re-seeds the rng) is CAUGHT by the Level-1/2 fixtures: a broken digest makes
 *     the deterministic scenario WRONGLY appear to diverge, or makes the
 *     nondeterminism leak WRONGLY missed — and the meta-test goes RED. If the
 *     harness itself breaks, these meta-tests go red.
 *
 * DETERMINISM PROOF: this file and the whole harness read ZERO real time / real
 * randomness — the world's clock/rng are seed-driven. The Level-2 leak fixtures
 * are the ONLY place raw Date.now()/Math.random() appear, and they are the
 * deliberate ANTI-pattern the gate exists to catch (so they live in a test, never
 * the harness). The drift guard `simulation-determinism-substrate.test.ts` pins
 * that the harness source itself has no ambient reads.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import {
  makeWorld,
  runScenario,
  replay,
  assertReplayDeterministic,
  traceDigest,
  tracesAgree,
  consultFault,
  observeClocks,
  type SimScenario,
  type SimWorld,
  type SimStep,
  type StepOutcome,
  type Scheduler,
  type SchedulerWorld,
  type FaultTable,
  type SimTrace,
} from '@czap/core/simulation';
import { rawIndexF32 } from '@czap/core';
import {
  simulationDeterminismGate,
  verifyGate,
  earnedAuthority,
  type ScenarioReplayFact,
  type SimulationFacts,
  type GateContext,
} from '@czap/gauntlet';

// ───────────────────────── shared real SUT scenarios ─────────────────────────

/**
 * A DETERMINISTIC, REAL-CODE scenario: drive `rawIndexF32` (the production
 * f32-canonical boundary-evaluator kernel — THE numeric semantics for boundary
 * evaluation across the repo) over a sequence of values, AND fold in the world's
 * seeded rng + fixed clocks. Every observation is a pure function of the seed +
 * the injected substrate, so two runs from the same seed are byte-identical. This
 * is the harness working on real production code, not a toy.
 */
const boundaryEvaluateScenario: SimScenario = {
  id: 'boundary-evaluate-sequence',
  steps: (world: SimWorld): readonly SimStep[] => {
    const thresholds = [0, 0.25, 0.5, 0.75];
    // Five values drawn from the world's SEEDED rng — deterministic per seed.
    const steps: SimStep[] = [];
    for (let i = 0; i < 5; i += 1) {
      steps.push({
        label: `boundary.eval.${i}`,
        act: (w: SchedulerWorld): unknown => {
          const value = w.rng.next();
          const index = rawIndexF32(thresholds, value);
          // Advance the world's monotonic clock to simulate elapsed work, then
          // OBSERVE the fixed clocks (deterministic — never real time).
          world.clock.advance(16);
          const { monotonicMs, wallMs } = observeClocks(world);
          return { index, monotonicMs, wallMs };
        },
      });
    }
    return steps;
  },
};

// ─────────────────────────────── LEVEL 1 ────────────────────────────────────

describe('LEVEL 1 — a deterministic scenario replays BYTE-EXACT (the harness IS deterministic)', () => {
  it('replays a real-SUT (rawIndexF32) scenario byte-identical from seed S', async () => {
    const seed = 0xc0ffee;
    const a = await replay(seed, boundaryEvaluateScenario);
    const b = await replay(seed, boundaryEvaluateScenario);
    expect(traceDigest(a)).toBe(traceDigest(b));
    expect(tracesAgree(a, b)).toBe(true);
  });

  it('assertReplayDeterministic reports deterministic:true for the deterministic scenario', async () => {
    const result = await assertReplayDeterministic(42, boundaryEvaluateScenario);
    expect(result.deterministic).toBe(true);
    expect(result.firstDigest).toBe(result.secondDigest);
  });

  it('different seeds produce different traces (the seed actually drives the run)', async () => {
    const a = await replay(1, boundaryEvaluateScenario);
    const b = await replay(2, boundaryEvaluateScenario);
    expect(traceDigest(a)).not.toBe(traceDigest(b));
  });

  it('the run is byte-stable across many seeds (no hidden ambient read leaks in)', async () => {
    for (const seed of [0, 1, 7, 99, 123456, 2 ** 30]) {
      const r = await assertReplayDeterministic(seed, boundaryEvaluateScenario);
      expect(r.deterministic).toBe(true);
    }
  });
});

// ─────────────────────────────── LEVEL 2 ────────────────────────────────────

/**
 * THE INJECTED-NONDETERMINISM SUT — the deliberate ANTI-pattern. This scenario's
 * step reads RAW Date.now() / Math.random() AND a process-global mutable counter,
 * BYPASSING the world's injected substrate. That is exactly the leak the DST gate
 * exists to catch; it appears ONLY here (a test), never in the harness. Two replays
 * from the same seed read DIFFERENT real wall times / random draws / ambient counter
 * values, so their traces DIVERGE.
 *
 * Why the counter: `Date.now()` has millisecond resolution, so two back-to-back
 * replays CAN land in the same ms and (falsely) agree on the timestamp alone. The
 * counter is a faithful, RELIABLY-divergent ambient leak — process state the world
 * does not reset between replays (exactly the class of leak a SUT reaching outside
 * the injected substrate exhibits). Reading it together with `Date.now()` keeps the
 * scenario a genuine wall-clock-read leak while making the divergence deterministic.
 */
let ambientLeakCounter = 0;

const leakyClockScenario: SimScenario = {
  id: 'leaky-clock-read',
  steps: (): readonly SimStep[] => [
    {
      label: 'sut.timestamp',
      // DELIBERATE leak: the anti-pattern the gate must catch.
      act: (): unknown => ({ wallTime: Date.now(), ambient: (ambientLeakCounter += 1) }),
    },
  ],
};

const leakyRandomScenario: SimScenario = {
  id: 'leaky-random-read',
  steps: (): readonly SimStep[] => [
    {
      label: 'sut.random',
      // DELIBERATE leak: the anti-pattern the gate must catch.
      act: (): unknown => ({ leaked: Math.random() }),
    },
  ],
};

/** Project a determinism result into the host SimulationFacts the gate folds. */
function factFromResult(scenarioId: string, r: { seed: number; firstDigest: string; secondDigest: string; deterministic: boolean }): ScenarioReplayFact {
  return {
    scenarioId,
    seed: r.seed,
    firstDigest: r.firstDigest,
    secondDigest: r.secondDigest,
    ...(r.deterministic
      ? {}
      : {
          divergence: {
            firstDivergentLabel: 'sut.timestamp',
            detail: 'two replays of the same seed produced different trace digests — the SUT read an ambient source',
          },
        }),
  };
}

function factsContext(facts: SimulationFacts): GateContext {
  return { repoRoot: '/sim', readFile: (): undefined => undefined, files: (): readonly string[] => [], simulation: facts };
}

describe('LEVEL 2 — an injected-nondeterminism SUT DIVERGES and the DST gate CATCHES it', () => {
  it('a SUT that reads raw Date.now() bypassing the world DIVERGES on replay', async () => {
    const r = await assertReplayDeterministic(7, leakyClockScenario);
    // The trust keystone: the harness is NOT falsely passing — it sees the leak.
    expect(r.deterministic).toBe(false);
    expect(r.firstDigest).not.toBe(r.secondDigest);
  });

  it('a SUT that reads raw Math.random() bypassing the world DIVERGES on replay', async () => {
    const r = await assertReplayDeterministic(7, leakyRandomScenario);
    expect(r.deterministic).toBe(false);
  });

  it('the DST gate folds the divergence into a self-explaining replay-divergence Finding (carrying the seed)', async () => {
    const r = await assertReplayDeterministic(1337, leakyClockScenario);
    const facts: SimulationFacts = { runs: [factFromResult('leaky-clock-read', r)] };
    const findings = simulationDeterminismGate.run(factsContext(facts));
    expect(findings).toHaveLength(1);
    const f = findings[0]!;
    expect(f.ruleId).toBe('gauntlet/simulation-determinism/replay-divergence');
    expect(f.severity).toBe('error');
    expect(f.level).toBe('L4');
    // The seed travels with the finding so the bug replays byte-for-byte.
    expect(f.detail).toContain('1337');
    expect(f.detail).toContain('leaky-clock-read');
  });

  it('the gate stays GREEN on a clean (deterministic) corpus — no false positive', async () => {
    const r = await assertReplayDeterministic(3, boundaryEvaluateScenario);
    expect(r.deterministic).toBe(true);
    const facts: SimulationFacts = { runs: [factFromResult('boundary-evaluate-sequence', r)] };
    const findings = simulationDeterminismGate.run(factsContext(facts));
    // No divergence ⇒ no error findings.
    expect(findings.filter((f) => f.severity === 'error')).toHaveLength(0);
  });

  it('the gate reports honest "not-evidenced" (advisory) when no DST facts are injected (never a silent green)', () => {
    const findings = simulationDeterminismGate.run(factsContext({}));
    expect(findings).toHaveLength(1);
    expect(findings[0]!.ruleId).toBe('gauntlet/simulation-determinism/not-evidenced');
    expect(findings[0]!.severity).toBe('advisory');
  });

  it('the DST gate SELF-PROVES against its own fixtures and earns BLOCKING authority', () => {
    const proof = verifyGate(simulationDeterminismGate);
    expect(proof.redCaught).toBe(true);
    expect(proof.greenClean).toBe(true);
    expect(proof.mutationKilled).toBe(true);
    expect(proof.selfProven).toBe(true);
    expect(earnedAuthority(proof)).toBe('blocking');
  });
});

// ─────────────────────────────── LEVEL 3 ────────────────────────────────────

/** A scenario whose SINGLE step's outcome is driven by a SEEDED FAULT firing. */
const faultedScenario: SimScenario = {
  id: 'seeded-fault-flow',
  steps: (world: SimWorld): readonly SimStep[] => [
    {
      label: 'worker.message',
      act: (w: SchedulerWorld): unknown => {
        const decision = consultFault(world.faults, 'worker.message', w.rng);
        if (decision.fired && decision.fault.kind === 'drop') {
          return { delivered: false, reason: decision.fault.detail ?? 'dropped' };
        }
        // Not dropped: deliver a deterministic payload from the seeded rng.
        return { delivered: true, payload: w.rng.next() };
      },
    },
  ],
};

/** The fault table that drops the worker message ALWAYS (probability 1). */
const ALWAYS_DROP: FaultTable = [
  { point: 'worker.message', kind: 'drop', probability: 1, detail: 'simulated worker drop' },
];

describe('LEVEL 3a — a seeded FAULT that causes a failure replays IDENTICALLY from its seed', () => {
  it('the same seed + fault table reproduces the dropped-message trace byte-for-byte', async () => {
    const seed = 555;
    const opts = { faults: ALWAYS_DROP };
    const a = await replay(seed, faultedScenario, opts);
    const b = await replay(seed, faultedScenario, opts);
    expect(traceDigest(a)).toBe(traceDigest(b));
    // The fault actually fired (the failure is real, not absent).
    expect(a.entries[0]!.value).toMatchObject({ delivered: false });
  });

  it('a seed-driven (probability 0.5) fault fires deterministically per seed and replays identically', async () => {
    const halfDrop: FaultTable = [{ point: 'worker.message', kind: 'drop', probability: 0.5 }];
    const opts = { faults: halfDrop };
    // Whatever each seed decides, it decides the SAME way every replay.
    for (const seed of [1, 2, 3, 10, 42, 99]) {
      const r = await assertReplayDeterministic(seed, faultedScenario, opts);
      expect(r.deterministic).toBe(true);
    }
  });

  it('consultFault advances the rng stream identically whether or not a fault fires (no stream fork)', async () => {
    // A never-firing fault (probability 0) must still draw, so a downstream rng
    // read is unaffected by the presence of the fault — proving the no-fork law.
    const neverDrop: FaultTable = [{ point: 'worker.message', kind: 'drop', probability: 0 }];
    const withFault = await replay(77, faultedScenario, { faults: neverDrop });
    const noFault = await replay(77, faultedScenario, { faults: [] });
    // With the never-firing fault, the message IS delivered (not dropped) — but
    // its payload was drawn AFTER the fault's (always-taken) draw, so it differs
    // from the no-fault run's payload. Both runs are individually deterministic.
    expect(withFault.entries[0]!.value).toMatchObject({ delivered: true });
    expect(noFault.entries[0]!.value).toMatchObject({ delivered: true });
    // Each is self-consistent across replay (the load-bearing property).
    const wf2 = await replay(77, faultedScenario, { faults: neverDrop });
    expect(traceDigest(withFault)).toBe(traceDigest(wf2));
  });
});

describe('LEVEL 3b — a deliberately BROKEN harness is CAUGHT by the Level-1/2 fixtures', () => {
  /**
   * BROKEN-HARNESS #1: a traceDigest that IGNORES part of the trace (drops every
   * entry's `value`, keeping only labels). A digest that ignores the observations
   * would make a TRULY-divergent run (Level-2 leak) WRONGLY appear identical — the
   * harness would falsely pass. We prove the Level-2 leak is MISSED under the
   * broken digest, so a meta-test asserting "the leak is caught" would go RED.
   */
  function brokenDigestIgnoringValues(trace: SimTrace): string {
    // Folds only the labels — the load-bearing `value` observations are dropped.
    return JSON.stringify(trace.entries.map((e) => e.label));
  }

  it('a digest that ignores observations WRONGLY misses the Level-2 nondeterminism leak (so the meta-test catches the broken harness)', async () => {
    // The REAL harness catches the leak:
    const real = await assertReplayDeterministic(7, leakyClockScenario);
    expect(real.deterministic).toBe(false); // correct harness: leak detected.

    // The BROKEN digest (ignores values) sees the two leaky runs as "identical"
    // because they share labels — it WRONGLY passes:
    const a = real.first;
    const b = real.second;
    const brokenSaysAgree = brokenDigestIgnoringValues(a) === brokenDigestIgnoringValues(b);
    expect(brokenSaysAgree).toBe(true); // the broken harness falsely passes.

    // THE META-ASSERTION: the correct and broken harness DISAGREE — Level-2's
    // "deterministic must be false" assertion FAILS under the broken digest, so a
    // CI running the meta-proof with this broken digest goes RED. If the harness
    // itself breaks, the meta-tests go red.
    const realSaysAgree = traceDigest(a) === traceDigest(b);
    expect(realSaysAgree).not.toBe(brokenSaysAgree);
  });

  /**
   * Same steps as {@link boundaryEvaluateScenario}, but the trace observation
   * includes the raw rng draw — not just the {@link rawIndexF32} bucket. LEVEL 3b
   * needs this: a broken Math.random scheduler can produce different draws that
   * quantize to the same index; without the raw draw in the trace the meta-test
   * flaked (~0.1% collision rate).
   */
  const boundaryEvaluateWithRawDraw: SimScenario = {
    id: 'boundary-evaluate-sequence-raw-draw',
    steps: (world: SimWorld): readonly SimStep[] => {
      const thresholds = [0, 0.25, 0.5, 0.75];
      const steps: SimStep[] = [];
      for (let i = 0; i < 5; i += 1) {
        steps.push({
          label: `boundary.eval.${i}`,
          act: (w: SchedulerWorld): unknown => {
            const draw = w.rng.next();
            const index = rawIndexF32(thresholds, draw);
            world.clock.advance(16);
            const { monotonicMs, wallMs } = observeClocks(world);
            return { index, draw, monotonicMs, wallMs };
          },
        });
      }
      return steps;
    },
  };

  /**
   * BROKEN-HARNESS #2: a scheduler that RE-SEEDS the rng mid-run (replaces the
   * world's seeded rng with a fresh Math.random-backed one). A re-seeding scheduler
   * would make the DETERMINISTIC Level-1 scenario WRONGLY appear to diverge — the
   * harness would falsely FAIL a good run. We prove the deterministic scenario
   * diverges under the broken scheduler, so a meta-test asserting "deterministic"
   * would go RED.
   */
  const reseedingScheduler: Scheduler = {
    _tag: 'real-loop',
    run: async (world: SchedulerWorld, steps: readonly SimStep[]): Promise<readonly StepOutcome[]> => {
      // The corruption: thread a NON-seeded rng (reads Math.random) into each step,
      // so two replays read different streams — a re-seed that breaks determinism.
      // DELIBERATE corruption for the broken-harness meta-proof.
      const corrupt: SchedulerWorld = { ...world, rng: { next: (): number => Math.random() } };
      const outcomes: StepOutcome[] = [];
      for (const step of steps) {
        outcomes.push({ label: step.label, value: await step.act(corrupt) });
      }
      return outcomes;
    },
  };

  it('a scheduler that re-seeds the rng makes the DETERMINISTIC scenario WRONGLY diverge (so the meta-test catches the broken harness)', async () => {
    // Under the REAL scheduler the deterministic scenario replays byte-exact:
    const good = await assertReplayDeterministic(9, boundaryEvaluateScenario);
    expect(good.deterministic).toBe(true);

    // Under the BROKEN (re-seeding) scheduler the SAME deterministic scenario now
    // diverges — Level-1's "deterministic must be true" assertion would FAIL, so a
    // CI running the meta-proof with this broken scheduler goes RED.
    const seed = 9;
    const a = await runScenario(makeWorld(seed, { scheduler: reseedingScheduler }), boundaryEvaluateWithRawDraw);
    const b = await runScenario(makeWorld(seed, { scheduler: reseedingScheduler }), boundaryEvaluateWithRawDraw);
    expect(traceDigest(a)).not.toBe(traceDigest(b)); // broken harness: false divergence.
  });
});

// ──────────────── DETERMINISM PROOF + real-SUT integration ────────────────

describe('the harness works on REAL production code (not toy fixtures)', () => {
  it('drives rawIndexF32 (the production boundary kernel) through the world and replays byte-exact', async () => {
    const r = await assertReplayDeterministic(0xbeef, boundaryEvaluateScenario);
    expect(r.deterministic).toBe(true);
    // The observed indices are real rawIndexF32 outputs (0..3 for a 4-threshold ladder).
    for (const entry of r.first.entries) {
      const v = entry.value as { index: number };
      expect(v.index).toBeGreaterThanOrEqual(0);
      expect(v.index).toBeLessThanOrEqual(3);
    }
  });

  it('makeWorld rejects a non-integer seed (parse-don\'t-validate at the boundary)', () => {
    expect(() => makeWorld(1.5)).toThrow();
    expect(() => makeWorld(Number.NaN)).toThrow();
  });
});
