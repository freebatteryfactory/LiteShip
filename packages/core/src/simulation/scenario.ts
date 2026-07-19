/**
 * The SCENARIO + RUN + REPLAY — the FoundationDB property made concrete.
 *
 * A {@link SimScenario} is a DATA record (composition, no class): a stable id and
 * a `steps` builder that, given the {@link SimWorld}, produces the ordered
 * {@link SimStep}s to drive. The builder reads the world's fault table / fixtures
 * to assemble the steps, but each step reads time/randomness ONLY through the
 * world's injected substrate — so the scenario is a pure function of (seed, fault
 * table). {@link runScenario} drives the steps THROUGH THE WORLD'S SCHEDULER SEAM
 * and folds the observed outcomes into a byte-exact {@link SimTrace}.
 *
 * **The replay property (FoundationDB).** {@link replay} mints a FRESH world from
 * the same seed (same fault table) and runs the same scenario — and the two traces
 * must address EQUAL ({@link tracesAgree}). A bug found in CI carries its seed; the
 * developer replays from that one number and gets the byte-identical trace,
 * including the byte-identical FAILURE. {@link assertReplayDeterministic} runs the
 * scenario TWICE from the same seed and returns whether the two digests agree — the
 * primitive the Level-1 meta-proof asserts true and the Level-2 meta-proof (an
 * injected-nondeterminism SUT) asserts FALSE.
 *
 * The whole module reads ZERO ambient time/randomness: the world owns the clock
 * and rng, the scheduler drives ordering, and a step that reaches for raw
 * `Date.now()` / `Math.random()` is precisely the nondeterminism the DST gate
 * exists to catch — it is never sanctioned here.
 *
 * @module
 */

import type { ContentAddress } from '../schema/brands.js';
import type { SimStep } from './scheduler.js';
import { type SimWorld, makeWorld, type WorldOptions } from './world.js';
import { type SimTrace, buildTrace, traceDigest, tracesAgree } from './trace.js';

/**
 * A deterministic scenario over the world. `id` is the stable identity (a corpus
 * key); `steps` builds the ordered steps from the world (it may consult
 * `world.faults` to inject declared faults, but each step's `act` reads only the
 * world's substrate). Pure: same world ⇒ same steps ⇒ same trace.
 */
export interface SimScenario {
  /** Stable scenario id — the corpus/regression-seed key. */
  readonly id: string;
  /** Build the ordered steps from the world (reads fault table / fixtures). */
  readonly steps: (world: SimWorld) => readonly SimStep[];
}

/**
 * Run a scenario against a world: build its steps, drive them THROUGH THE WORLD'S
 * scheduler seam, and fold the observed outcomes into a byte-exact trace. Async
 * because the scheduler is (steps may be async; the seam owns ordering). The
 * returned trace's digest ({@link traceDigest}) is the run's identity.
 */
export async function runScenario(world: SimWorld, scenario: SimScenario): Promise<SimTrace> {
  const steps: readonly SimStep[] = scenario.steps(world);
  const outcomes = await world.scheduler.run(world, steps);
  return buildTrace(world.seed, outcomes, `scenario:${scenario.id}`);
}

/**
 * Replay a scenario from a seed: mint a FRESH world from that seed (with the same
 * world options — fault table, scheduler, epoch) and run the scenario. The
 * returned trace must address equal to the original run from the same seed — that
 * equality IS the replay property. Returns the replayed trace so a caller can
 * compare or re-inspect it.
 */
export async function replay(seed: number, scenario: SimScenario, options: WorldOptions = {}): Promise<SimTrace> {
  const world = makeWorld(seed, options);
  return runScenario(world, scenario);
}

/** The result of a determinism assertion — two digests and whether they agree. */
export interface ReplayDeterminism {
  /** The seed both runs used. */
  readonly seed: number;
  /** The first run's trace digest. */
  readonly firstDigest: ContentAddress;
  /** The second run's trace digest. */
  readonly secondDigest: ContentAddress;
  /** Whether the two runs produced byte-identical traces (the replay property). */
  readonly deterministic: boolean;
  /** The two traces, for a divergence report. */
  readonly first: SimTrace;
  readonly second: SimTrace;
}

/**
 * Run a scenario TWICE from the same seed (two fresh worlds) and report whether
 * the two traces agree byte-exact. This is the primitive the recursive meta-proof
 * turns on: a TRULY deterministic scenario returns `deterministic: true` (Level
 * 1); a scenario whose SUT leaks ambient nondeterminism (raw `Date.now()` /
 * `Math.random()` bypassing the world) returns `deterministic: false` (Level 2),
 * and THAT false is the replay-divergence the DST gate folds into a Finding.
 *
 * It does NOT itself decide pass/fail — it REPORTS the two digests and their
 * agreement; the gate / meta-test decides. (Report-not-decide, mirroring the
 * oracle-divergence model.)
 */
export async function assertReplayDeterministic(
  seed: number,
  scenario: SimScenario,
  options: WorldOptions = {},
): Promise<ReplayDeterminism> {
  const first = await replay(seed, scenario, options);
  const second = await replay(seed, scenario, options);
  return {
    seed,
    firstDigest: traceDigest(first),
    secondDigest: traceDigest(second),
    deterministic: tracesAgree(first, second),
    first,
    second,
  };
}
