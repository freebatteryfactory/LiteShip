/**
 * `@czap/core/simulation` — the DETERMINISTIC SIMULATION TESTING (DST) harness, a
 * FoundationDB-style seeded world + scheduler seam over the determinism substrate.
 *
 * A seeded {@link SimWorld} fixes time ({@link Clock}) and randomness ({@link Rng})
 * behind the same injectable shapes the runtime threads, adds a {@link FaultTable}
 * and a {@link Scheduler} SEAM, and runs a {@link SimScenario} to a byte-exact,
 * content-addressed {@link SimTrace}. {@link replay} re-runs from the same seed and
 * the trace must address EQUAL ({@link traceDigest}) — a bug found in CI replays
 * deterministically from its seed.
 *
 * The {@link realLoopScheduler} ships now (sequential drive, deterministic for
 * single-threaded scenarios); the full FoundationDB interleaving scheduler is a
 * documented DROP-IN under the SAME {@link Scheduler} interface (see `scheduler.ts`),
 * so the scenario API does not change when it is swapped in.
 *
 * The DST GATE (a replay-divergence is a self-explaining Finding) lives in
 * `@czap/gauntlet` and folds host-injected SIM facts — the lean-engine pattern.
 *
 * @module
 */

export {
  type Scheduler,
  type SchedulerWorld,
  type SimStep,
  type StepOutcome,
  realLoopScheduler,
} from './scheduler.js';

export {
  type Fault,
  type FaultKind,
  type FaultTable,
  type FaultDecision,
  consultFault,
} from './fault.js';

export {
  type SimWorld,
  type WorldOptions,
  type Clock as SimClock,
  DEFAULT_SIM_EPOCH_MS,
  makeWorld,
  observeClocks,
} from './world.js';

export {
  type TraceEntry,
  type SimTrace,
  buildTrace,
  traceDigest,
  tracesAgree,
} from './trace.js';

export {
  type SimScenario,
  type ReplayDeterminism,
  runScenario,
  replay,
  assertReplayDeterministic,
} from './scenario.js';
