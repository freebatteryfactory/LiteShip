/**
 * THE DST SCENARIO CORPUS (`packages/cli/src/lib/simulation-corpus.ts`) — the
 * committed, content-addressed set of deterministic scenarios the host drives the
 * REAL L4 trust-spine code through, certifying byte-exact replay (the FoundationDB
 * property).
 *
 * Pins:
 *  - THE CORPUS SHAPE: four L4 SUT scenarios (content-address, HLC, graph-patch,
 *    boundary-evaluator), each with a non-empty, integer seed list.
 *  - THE CERTIFICATE: `runSimulationCorpus` replays every (scenario, seed) twice and
 *    folds a `ScenarioReplayFact` per pair — and because the SUTs are PURE, EVERY
 *    fact is deterministic (no divergence). This is the strong positive assurance the
 *    DST gate folds (a divergence here would be a real nondeterminism bug).
 *  - THE TWO-CLOCK / SEEDED-SUBSTRATE LAW: each scenario, driven directly through
 *    `assertReplayDeterministic`, replays byte-exact from a single seed (the SUT reads
 *    time/randomness ONLY through the world's injected clock/rng — never ambient).
 *  - DETERMINISM OF THE FOLD ITSELF: two runs of the whole corpus produce byte-
 *    identical facts (the fold reads no ambient entropy; facts are in corpus order).
 *  - THE DIVERGENCE PATH (the honest catch): a synthetic SUT that reads AMBIENT
 *    randomness (bypassing the world) replays NON-deterministically — proving the
 *    harness the host folds actually detects the cardinal DST failure, the exact
 *    condition `runSimulationCorpus` records as a divergence.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import { contentAddressOf } from '@czap/core';
import {
  assertReplayDeterministic,
  type SimScenario,
  type SimWorld,
  type SimStep,
  type SchedulerWorld,
} from '@czap/core/simulation';
import { SIMULATION_CORPUS, runSimulationCorpus } from '../../../../packages/cli/src/lib/simulation-corpus.js';

describe('SIMULATION_CORPUS — the committed L4 trust-spine corpus', () => {
  it('covers the four L4 SUT seams, each with a non-empty integer seed list', () => {
    const ids = SIMULATION_CORPUS.map((e) => e.scenario.id);
    expect(ids).toEqual([
      'content-address-sequence',
      'hlc-causal-merge-sequence',
      'graph-patch-apply-diff-sequence',
      'boundary-evaluate-batch-sequence',
    ]);
    for (const { seeds } of SIMULATION_CORPUS) {
      expect(seeds.length).toBeGreaterThan(0);
      for (const seed of seeds) expect(Number.isInteger(seed)).toBe(true);
    }
  });

  it('every scenario builds a non-empty, well-labeled step list from a fresh world', () => {
    // Drive the builder directly so each scenario's `steps(world)` body is exercised
    // (the per-scenario closure state is set up here, the `act` bodies below).
    for (const { scenario } of SIMULATION_CORPUS) {
      const steps = scenario.steps(makeStubWorld(7));
      expect(steps.length).toBeGreaterThan(0);
      for (const step of steps) expect(typeof step.label).toBe('string');
    }
  });
});

describe('runSimulationCorpus — the determinism certificate the gate folds', () => {
  it('replays every (scenario, seed) and yields a deterministic fact for each (zero divergences)', async () => {
    const facts = await runSimulationCorpus();
    const runs = facts.runs ?? [];
    const expectedCount = SIMULATION_CORPUS.reduce((n, e) => n + e.seeds.length, 0);
    expect(runs).toHaveLength(expectedCount);
    // Every PURE SUT replays byte-exact → no run carries a divergence + the two digests
    // agree. A divergence here would be a real nondeterminism bug, surfaced not hidden.
    for (const run of runs) {
      expect(run.divergence).toBeUndefined();
      expect(run.firstDigest).toBe(run.secondDigest);
      expect(run.firstDigest).toMatch(/^fnv1a:[0-9a-f]+$/);
    }
  });

  it('emits a fact for every corpus (scenario, seed) pair, in corpus order', async () => {
    const facts = await runSimulationCorpus();
    const runs = facts.runs ?? [];
    const expectedPairs = SIMULATION_CORPUS.flatMap((e) => e.seeds.map((seed) => `${e.scenario.id}@${seed}`));
    const actualPairs = runs.map((r) => `${r.scenarioId}@${r.seed}`);
    expect(actualPairs).toEqual(expectedPairs);
  });

  it('the fold is itself deterministic: two whole-corpus runs produce byte-identical facts', async () => {
    const a = await runSimulationCorpus();
    const b = await runSimulationCorpus();
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('each scenario replays byte-exact from a single seed (the seeded-substrate law)', () => {
  // A grid of (scenario, seed) so the merge/diff/ladder BRANCHES inside each `act`
  // get exercised across several seeds — the replay must hold for all of them.
  for (const { scenario, seeds } of SIMULATION_CORPUS) {
    for (const seed of seeds) {
      it(`"${scenario.id}" is deterministic at seed ${seed}`, async () => {
        const result = await assertReplayDeterministic(seed, scenario);
        expect(result.deterministic).toBe(true);
        expect(result.firstDigest).toBe(result.secondDigest);
        // The observed trace is non-empty (the SUT actually ran).
        expect(result.first.entries.length).toBeGreaterThan(0);
      });
    }
  }

  it('exercises the graph-patch DIFF branch (a seed that drops below the grow threshold)', async () => {
    // The graph-patch scenario chooses grow vs diff per `w.rng.next() < 0.6`. Replay it
    // across a spread of seeds and assert SOME run took the diff path (its trace carries
    // a `kind: 'diff'` observation with a round-trip-ok flag) — proving the differ branch
    // is live, not dead. Driven directly so we can read the entry values.
    const graphPatch = SIMULATION_CORPUS.find((e) => e.scenario.id === 'graph-patch-apply-diff-sequence')!;
    let sawDiff = false;
    let sawAdd = false;
    for (const seed of [...graphPatch.seeds, 11, 22, 33, 44, 55]) {
      const result = await assertReplayDeterministic(seed, graphPatch.scenario);
      for (const entry of result.first.entries) {
        const v = entry.value as { kind?: string; roundTripOk?: boolean };
        if (v.kind === 'diff') {
          sawDiff = true;
          expect(v.roundTripOk).toBe(true); // apply(a, diff(a,b)) === b (the CRDT law)
        }
        if (v.kind === 'add') sawAdd = true;
      }
    }
    expect(sawAdd).toBe(true);
    expect(sawDiff).toBe(true);
  });

  it('exercises the HLC MERGE branch and the local-increment branch across seeds', async () => {
    const hlc = SIMULATION_CORPUS.find((e) => e.scenario.id === 'hlc-causal-merge-sequence')!;
    let sawMerge = false;
    let sawLocal = false;
    for (const seed of [...hlc.seeds, 13, 17, 19]) {
      const result = await assertReplayDeterministic(seed, hlc.scenario);
      for (const entry of result.first.entries) {
        const v = entry.value as { merged?: boolean; encoded?: string };
        expect(typeof v.encoded).toBe('string'); // every step encodes a causal HLC
        if (v.merged === true) sawMerge = true;
        if (v.merged === false) sawLocal = true;
      }
    }
    expect(sawMerge).toBe(true);
    expect(sawLocal).toBe(true);
  });
});

describe('the divergence path — the honest catch (the harness DETECTS ambient nondeterminism)', () => {
  it('a SUT that reads ambient Math.random replays NON-deterministically (the cardinal DST failure)', async () => {
    // This is the EXACT condition `runSimulationCorpus` folds into a divergence: a SUT
    // that reaches OUTSIDE the world's injected rng. We prove the harness the host runs
    // catches it (so the corpus's all-green result is a real certificate, not a vacuous
    // pass that would also "pass" a leaky SUT).
    const leaky: SimScenario = {
      id: 'leaky-ambient-rng',
      steps: (): readonly SimStep[] => [
        {
          label: 'ambient.draw',
          // Reads REAL randomness, bypassing the world's seeded rng → two replays differ.
          act: (): unknown => ({ leaked: Math.random() }),
        },
      ],
    };
    const result = await assertReplayDeterministic(1, leaky);
    expect(result.deterministic).toBe(false);
    expect(result.firstDigest).not.toBe(result.secondDigest);
  });

  it('runSimulationCorpus records a VALUE-divergence (different value at a SHARED label) with the first divergent label', async () => {
    // Inject a divergent scenario through the REAL fold (not a fork). The leak is a
    // mutable counter OUTSIDE the world (the precise "reads state bypassing the injected
    // substrate" failure) — DETERMINISTIC here (no ambient entropy): the first replay
    // observes 0, the second observes 1, so the two traces part at "leaked.draw". The
    // labels match, so firstDivergence names that point (the labeled-point branch).
    let leak = 0;
    const leaky: SimScenario = {
      id: 'leaky-value-divergence',
      steps: (): readonly SimStep[] => [
        { label: 'stable.pre', act: (): unknown => ({ ok: 1 }) },
        {
          label: 'leaked.draw',
          act: (): unknown => {
            const v = leak;
            leak += 1;
            return { leaked: v };
          },
        },
      ],
    };
    const facts = await runSimulationCorpus([{ scenario: leaky, seeds: [1] }]);
    const run = (facts.runs ?? [])[0]!;
    expect(run.divergence).toBeDefined();
    expect(run.divergence!.firstDivergentLabel).toBe('leaked.draw');
    expect(run.divergence!.detail).toContain('leaky-value-divergence');
    expect(run.divergence!.detail).toContain('leaked.draw');
  });

  it('runSimulationCorpus records a SHAPE-divergence (different step count) with a null divergent label', async () => {
    // A scenario whose STEP COUNT leaks from a mutable counter OUTSIDE the world →
    // DETERMINISTIC here: the first replay builds 1 step, the second builds 2, so the
    // two traces differ in LENGTH. firstDivergence finds no labeled parting point (the
    // shared prefix agrees) and returns firstDivergentLabel: null with the shape detail.
    let stepCount = 1;
    const variableLength: SimScenario = {
      id: 'leaky-shape-divergence',
      steps: (): readonly SimStep[] => {
        const count = stepCount;
        stepCount += 1;
        const out: SimStep[] = [];
        for (let i = 0; i < count; i += 1) out.push({ label: `s.${i}`, act: (): unknown => ({ i }) });
        return out;
      },
    };
    const facts = await runSimulationCorpus([{ scenario: variableLength, seeds: [1] }]);
    const div = (facts.runs ?? [])[0]!.divergence;
    expect(div).toBeDefined();
    expect(div!.firstDivergentLabel).toBeNull();
    expect(div!.detail).toContain('different length/shape');
    expect(div!.detail).toContain('leaky-shape-divergence');
  });
});

/**
 * A minimal SchedulerWorld/SimWorld stub for driving a scenario's `steps(world)`
 * builder in isolation (the corpus builders only read `world.clock`/`world.wallClock`
 * — they thread the rng into `act`, which the harness supplies). No ambient entropy:
 * the clocks are manual and the rng is a fixed deterministic counter.
 */
function makeStubWorld(seed: number): SimWorld {
  let mono = 0;
  let wall = 0;
  let n = seed;
  const nextRng = (): number => {
    // A tiny deterministic LCG-ish stream — fixed given the seed, no ambient read.
    n = (n * 1103515245 + 12345) & 0x7fffffff;
    return n / 0x7fffffff;
  };
  const stub: SchedulerWorld = {
    seed,
    rng: { next: nextRng },
    clock: {
      now: (): number => mono,
      advance: (ms: number): void => {
        mono += ms;
      },
    } as SimWorld['clock'],
    wallClock: {
      now: (): number => wall,
      advance: (ms: number): void => {
        wall += ms;
      },
    } as SimWorld['wallClock'],
  };
  // The builders only read the SchedulerWorld slice; satisfy SimWorld structurally for
  // the type by carrying the (unused-by-builders) fault table + scheduler seam.
  return { ...stub, faults: [], scheduler: { _tag: 'real-loop', run: async () => [] } } as SimWorld;
}

// A reference to contentAddressOf to anchor the determinism mental model in this suite
// (the trace digests above are this kernel over the ordered observations).
void contentAddressOf;
