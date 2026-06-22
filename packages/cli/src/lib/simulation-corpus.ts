/**
 * THE DST SCENARIO CORPUS — the committed, content-addressed set of deterministic
 * scenarios the host (`czap check --ir --simulate`) drives the REAL L4 TRUST-SPINE
 * code through, certifying byte-exact replay (FoundationDB property).
 *
 * Each {@link SimScenario} here drives ONE production L4 system-under-test — the
 * "if this lies, downstream trusts bad reality" code — through the seeded
 * {@link makeWorld} substrate (`@czap/core/simulation`). A scenario is a pure
 * function of (seed, world): it reads time/randomness ONLY through the world's
 * injected clock/rng, exercises a real SUT, and folds the SUT's deterministic
 * outputs into an observable {@link SimTrace}. Because these SUTs are pure, two
 * replays from the same seed MUST address byte-equal — this corpus CERTIFIES that
 * (a strong positive assurance). A divergence is a REAL nondeterminism bug (the SUT
 * reads ambient time/random, or has an ordering bug), surfaced honestly via the
 * {@link simulationDeterminismGate}, never hidden or fake-passed.
 *
 * The L4 seams covered:
 *  - CONTENT-ADDRESS — `contentAddressOf` over a seed-driven value sequence: the
 *    identity kernel every other identity rests on (the digest sequence is the trace).
 *  - HLC — `HLC.create`/`increment`/`merge`/`encode` across N node-ids, driven by
 *    the WORLD's wall clock: causal-order identity (the encoded HLC sequence is the
 *    trace).
 *  - GRAPH-PATCH — `GraphPatch.propose`/`apply`/`diff` over seed-built small graphs:
 *    the tagged-delta CRDT re-addressing (the resulting graph ids are the trace).
 *  - BOUNDARY-EVALUATOR — `rawIndexF32` over generated thresholds + values: THE
 *    numeric semantics of boundary evaluation (the index sequence is the trace).
 *
 * LEAN BOUNDARY: the corpus lives in the CLI HOST (which deps `@czap/core`), NOT in
 * `@czap/gauntlet` (the lean engine imports no DST harness). The host runs the
 * corpus through `assertReplayDeterministic` and folds the verdicts into the flat
 * {@link SimulationFacts} the gate folds — exactly the ADR-0012 host-computes /
 * engine-folds pattern the `--supply-chain` and `--mutate` paths use.
 *
 * @module
 */

import {
  contentAddressOf,
  HLC,
  GraphPatch,
  sealNode,
  sealGraph,
  rawIndexF32,
  type ContentAddress,
  type CellMeta,
  type SignalNode,
  type DocumentGraph,
  type DocumentGraphNode,
} from '@czap/core';
import {
  assertReplayDeterministic,
  type SimScenario,
  type SimWorld,
  type SimStep,
  type SchedulerWorld,
} from '@czap/core/simulation';
import type { ScenarioReplayFact, SimulationFacts } from '@czap/gauntlet';

/**
 * One corpus entry: a scenario paired with the seeds the host replays it from.
 * Multiple seeds widen the certificate — a SUT that is deterministic under one
 * seed but leaks under another is caught by replaying each. The corpus is a pure
 * data list (composition, no class).
 */
export interface CorpusEntry {
  /** The scenario driving a real L4 SUT through the seeded world. */
  readonly scenario: SimScenario;
  /** The seeds the host replays this scenario from (each twice → compare digests). */
  readonly seeds: readonly number[];
}

// ─────────────────────── L4 SUT #1 — CONTENT-ADDRESS ────────────────────────

/**
 * Drive `contentAddressOf` (THE identity kernel — fnv1a over canonical CBOR) over a
 * sequence of values built from the world's SEEDED rng + fixed clocks. Each step
 * content-addresses a record assembled from deterministic draws; the address is the
 * observed value. The identity kernel MUST be deterministic — equal bytes ⇒ equal
 * address — so two replays from one seed produce the same digest sequence.
 */
const contentAddressScenario: SimScenario = {
  id: 'content-address-sequence',
  steps: (world: SimWorld): readonly SimStep[] => {
    const steps: SimStep[] = [];
    for (let i = 0; i < 6; i += 1) {
      steps.push({
        label: `content-address.${i}`,
        act: (w: SchedulerWorld): unknown => {
          // A record assembled from SEEDED draws + the fixed monotonic clock —
          // every field is a pure function of (seed, step index).
          world.clock.advance(8);
          const payload = {
            index: i,
            a: w.rng.next(),
            b: w.rng.next(),
            tick: world.clock.now(),
            nested: { tag: `n-${i}`, v: w.rng.next() },
          };
          const address: ContentAddress = contentAddressOf(payload);
          return { address };
        },
      });
    }
    return steps;
  },
};

// ──────────────────────────── L4 SUT #2 — HLC ───────────────────────────────

/**
 * Drive the Hybrid Logical Clock pure ops (`create`/`increment`/`merge`/`encode`)
 * across N node-ids, advancing the WORLD's wall clock between events so every `now`
 * fed to `increment`/`merge` is a fixed, seed-independent-but-deterministic reading
 * — never `Date.now()`. The encoded HLC string is the observed value; causal order
 * (the load-bearing property) must replay byte-exact. The rng selects which node
 * acts and how far the wall clock advances, so the interleaving is seed-driven.
 */
const hlcCausalScenario: SimScenario = {
  id: 'hlc-causal-merge-sequence',
  steps: (world: SimWorld): readonly SimStep[] => {
    const nodeIds = ['node-A', 'node-B', 'node-C'] as const;
    // Each node's current HLC, threaded across steps (closure state is the causal
    // history — deterministic because every mutation reads the world's substrate).
    const clocks = new Map(nodeIds.map((id) => [id, HLC.create(id)]));
    const steps: SimStep[] = [];
    for (let i = 0; i < 9; i += 1) {
      steps.push({
        label: `hlc.${i}`,
        act: (w: SchedulerWorld): unknown => {
          // Advance the world's wall clock by a seed-driven amount (0..7 ms) so the
          // wall reading is deterministic and the counter/epoch logic is exercised.
          const advance = Math.floor(w.rng.next() * 8);
          world.wallClock.advance(advance);
          const now = world.wallClock.now();
          // Seed-driven actor + a seed-driven choice of local-tick vs merge.
          const localIdx = Math.floor(w.rng.next() * nodeIds.length);
          const local = nodeIds[localIdx] ?? nodeIds[0]!;
          const merge = w.rng.next() < 0.5;
          const current = clocks.get(local)!;
          let next;
          if (merge) {
            const remoteIdx = (localIdx + 1) % nodeIds.length;
            const remote = clocks.get(nodeIds[remoteIdx] ?? nodeIds[0]!)!;
            next = HLC.merge(current, remote, now);
          } else {
            next = HLC.increment(current, now);
          }
          clocks.set(local, next);
          return { node: local, merged: merge, encoded: HLC.encode(next), cmp: HLC.compare(current, next) };
        },
      });
    }
    return steps;
  },
};

// ───────────────────────── L4 SUT #3 — GRAPH-PATCH ──────────────────────────

/** A fixed, zero-HLC cell meta — the volatile fields stay constant so identity is content-driven. */
const SIM_META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 'sim' },
  updated: { wall_ms: 0, counter: 0, node_id: 'sim' },
  version: 1,
};

/** A minimal sealed Signal node keyed by its input axis — id is the content address of the payload. */
function signalNode(input: string): SignalNode {
  return sealNode({
    _tag: 'DocGraphSignalNode',
    _version: 1,
    family: 'signal',
    id: '' as ContentAddress,
    meta: SIM_META,
    input,
  } as SignalNode);
}

/** A small sealed DocumentGraph over the given signal nodes (no edges). */
function signalGraph(nodes: readonly DocumentGraphNode[]): DocumentGraph {
  return sealGraph({ _tag: 'DocumentGraph', _version: 1, meta: SIM_META, nodes: [...nodes], edges: [] });
}

/**
 * Drive the GraphPatch tagged-delta CRDT (`propose`/`apply`/`diff`) over small
 * graphs built from seed-driven signal axes. Each step proposes an add/remove patch
 * (seed-chosen) against the running graph, applies it (RE-ADDRESSING through the one
 * kernel via `sealGraph`), and — on a diff step — confirms the structural differ
 * round-trips. The resulting graph id (+ patch resultId) is the observed value; the
 * re-addressing must replay byte-exact (equal ops ⇒ equal id).
 */
const graphPatchScenario: SimScenario = {
  id: 'graph-patch-apply-diff-sequence',
  // The builder needs no world (the graph-patch SUT is content-driven — its identity
  // comes from the seeded axis names via the rng read inside `act`, not from a clock).
  steps: (_world: SimWorld): readonly SimStep[] => {
    // The running graph, threaded across steps. Starts with one axis.
    let graph: DocumentGraph = signalGraph([signalNode('axis-0')]);
    const steps: SimStep[] = [];
    for (let i = 1; i <= 6; i += 1) {
      steps.push({
        label: `graph-patch.${i}`,
        act: (w: SchedulerWorld): unknown => {
          const prior = graph;
          // Seed-driven choice: grow (add a new axis) or, when there is room, build a
          // target graph and DIFF toward it (exercising the structural differ).
          const grow = w.rng.next() < 0.6 || prior.nodes.length <= 1;
          if (grow) {
            const node = signalNode(`axis-${i}-${Math.floor(w.rng.next() * 1000)}`);
            const patch = GraphPatch.propose(prior, [{ op: 'add', family: 'signal', node }]);
            const next = GraphPatch.apply(prior, patch);
            graph = next;
            return { kind: 'add', resultId: patch.resultId, graphId: next.id, count: next.nodes.length };
          }
          // DIFF path: build a target with one node dropped, diff toward it, apply the
          // diff, and verify the round-trip (apply(a, diff(a,b)) addresses equal to b).
          const target = signalGraph(prior.nodes.slice(1));
          const delta = GraphPatch.diff(prior, target);
          const roundTripped = GraphPatch.apply(prior, delta);
          graph = roundTripped;
          return {
            kind: 'diff',
            patchId: GraphPatch.patchId(delta),
            graphId: roundTripped.id,
            targetId: target.id,
            roundTripOk: roundTripped.id === target.id,
          };
        },
      });
    }
    return steps;
  },
};

// ──────────────────── L4 SUT #4 — BOUNDARY EVALUATOR ────────────────────────

/**
 * Drive `rawIndexF32` (THE f32-canonical boundary-evaluator kernel — the numeric
 * semantics of boundary evaluation across the repo) over a seed-generated threshold
 * ladder + a sequence of seed-driven values, BATCH-style (evaluate the same value
 * against a generated ladder of varying length). The returned index is the observed
 * value; the f32 boundary semantics must replay byte-exact (equal value ⇒ equal index).
 */
const boundaryEvaluateScenario: SimScenario = {
  id: 'boundary-evaluate-batch-sequence',
  steps: (world: SimWorld): readonly SimStep[] => {
    const steps: SimStep[] = [];
    for (let i = 0; i < 8; i += 1) {
      steps.push({
        label: `boundary.eval.${i}`,
        act: (w: SchedulerWorld): unknown => {
          // A seed-generated, sorted threshold ladder of 1..4 ascending breakpoints.
          const ladderLen = 1 + Math.floor(w.rng.next() * 4);
          const ladder: number[] = [];
          for (let t = 0; t < ladderLen; t += 1) ladder.push(w.rng.next());
          ladder.sort((a, b) => a - b);
          // Evaluate a batch of three seed-driven values against the same ladder.
          const indices = [w.rng.next(), w.rng.next(), w.rng.next()].map((v) => rawIndexF32(ladder, v));
          world.clock.advance(16);
          return { ladderLen, indices, tick: world.clock.now() };
        },
      });
    }
    return steps;
  },
};

// ──────────────────────────── THE CORPUS ────────────────────────────────────

/**
 * The committed corpus — every L4 trust-spine SUT paired with the seeds the host
 * replays it from. A stable, reviewable data list: adding a scenario or a seed
 * widens the determinism certificate; the order is load-bearing only for the
 * facts' display order (the gate folds each independently).
 */
export const SIMULATION_CORPUS: readonly CorpusEntry[] = [
  { scenario: contentAddressScenario, seeds: [1, 0xc0ffee, 2 ** 30] },
  { scenario: hlcCausalScenario, seeds: [2, 0xbeef, 99] },
  { scenario: graphPatchScenario, seeds: [3, 1337, 7] },
  { scenario: boundaryEvaluateScenario, seeds: [4, 0xdeadbe, 123456] },
];

/**
 * Run the whole corpus through the DST harness and fold the verdicts into the flat
 * {@link SimulationFacts} the {@link simulationDeterminismGate} folds — the HOST's
 * job (ADR-0012: the host computes the facts, the lean engine folds them).
 *
 * For each (scenario, seed) the host replays the scenario TWICE from a FRESH world
 * (via `assertReplayDeterministic`) and compares the two byte-exact trace digests.
 * A DETERMINISTIC pair (the expected, certifying outcome for these pure SUTs) yields
 * a fact with no `divergence`; a DIVERGENT pair (a real nondeterminism bug — the SUT
 * read ambient time/random or has an ordering bug) yields a fact WITH the divergence
 * + the first parting trace label, so the gate surfaces it honestly and the seed
 * replays it byte-for-byte. NEVER widens a tolerance to hide a divergence.
 *
 * The fold is itself DETERMINISTIC and pure: it reads no ambient time/randomness
 * (the world owns the clock/rng), and the facts are emitted in corpus order so the
 * SimulationFacts are byte-stable across runs (the verdict cache can serve them).
 */
export async function runSimulationCorpus(): Promise<SimulationFacts> {
  const runs: ScenarioReplayFact[] = [];
  for (const { scenario, seeds } of SIMULATION_CORPUS) {
    for (const seed of seeds) {
      const result = await assertReplayDeterministic(seed, scenario);
      const base = {
        scenarioId: scenario.id,
        seed: result.seed,
        firstDigest: result.firstDigest,
        secondDigest: result.secondDigest,
      };
      if (result.deterministic) {
        runs.push(base);
        continue;
      }
      // A real divergence — locate the FIRST trace label at which the two replays
      // parted (null when they diverged in length/shape), and record the WHY. This
      // is surfaced, never hidden: the gate folds it into an L4 error Finding.
      runs.push({ ...base, divergence: firstDivergence(scenario.id, result.first.entries, result.second.entries) });
    }
  }
  return { runs };
}

/**
 * Locate the earliest trace label at which two replays parted (or `null` when they
 * diverged in length/shape rather than at a labeled point), and assemble the human
 * WHY the host records on the divergence. Pure — compares the two ordered entry
 * lists by content-addressing each value, so it never re-runs the harness.
 */
function firstDivergence(
  scenarioId: string,
  first: readonly { readonly label: string; readonly value: unknown }[],
  second: readonly { readonly label: string; readonly value: unknown }[],
): { readonly firstDivergentLabel: string | null; readonly detail: string } {
  const n = Math.min(first.length, second.length);
  for (let i = 0; i < n; i += 1) {
    const a = first[i]!;
    const b = second[i]!;
    if (a.label !== b.label || contentAddressOf(a.value) !== contentAddressOf(b.value)) {
      return {
        firstDivergentLabel: a.label,
        detail:
          `two replays of scenario "${scenarioId}" produced different observed values at trace point "${a.label}" — ` +
          `the system-under-test read real time / real randomness OUTSIDE the world's injected clock/rng substrate, or has an ordering bug`,
      };
    }
  }
  return {
    firstDivergentLabel: null,
    detail:
      `two replays of scenario "${scenarioId}" produced traces of different length/shape ` +
      `(${first.length} vs ${second.length} observations) — the SUT's step count is itself nondeterministic`,
  };
}
