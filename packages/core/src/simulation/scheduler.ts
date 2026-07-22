/**
 * The SCHEDULER SEAM — the one injectable that decides how a scenario's steps
 * are ordered and driven, so the FoundationDB-style deterministic scheduler is a
 * DROP-IN upgrade, never a rewrite of the scenario API.
 *
 * Determinism in a simulation has two distinct sources, and this module isolates
 * the second one behind an interface:
 *
 *  1. SUBSTRATE determinism — time and randomness are read through the injected
 *     {@link Clock}/{@link Rng} (the world fixes both). This kills wall-clock and
 *     `Math.random` nondeterminism. The world (`world.ts`) owns this.
 *  2. ORDERING determinism — the INTERLEAVING of concurrent/async steps. A bug
 *     that only manifests under a particular message ordering needs the scheduler
 *     to CONTROL that ordering, not observe it.
 *
 * **The seam.** A {@link Scheduler} is a plain value `{ _tag, run }` (composition,
 * no class): given an ordered list of {@link SimStep}s and the world's
 * {@link SchedulerWorld} (the substrate it threads into each step), it drives them
 * and returns the {@link StepOutcome}s in the order they were OBSERVED. The
 * scenario layer (`scenario.ts`) is written ENTIRELY against this interface — it
 * never names a concrete scheduler — so swapping the implementation cannot change
 * the scenario API.
 *
 * **What ships now: {@link realLoopScheduler}.** It runs the steps sequentially on
 * the real event loop, awaiting each before the next. For the single-threaded,
 * sequential scenarios this harness targets (a quantizer call, a graph-patch
 * sequence, a boundary evaluation), the observed order IS the declared order, so
 * with the world's fixed clock/rng the run is fully deterministic and replays
 * byte-exact. It reads NO real time and NO real randomness itself — all
 * nondeterminism it could introduce is ordering, and sequential drive removes it.
 *
 * **The documented DROP-IN: the full FoundationDB deterministic scheduler.** A
 * future `simulatedScheduler` (NOT built here — noted as the additive upgrade)
 * intercepts every Promise/timer/IO continuation and chooses the next ready step
 * from a SEED-DRIVEN priority over the world's {@link Rng}, exploring interleavings
 * a real loop would never reveal — and replaying the SAME interleaving from the
 * same seed. It satisfies THIS interface unchanged: a scenario does not know which
 * scheduler ran it. That is the whole point of the seam — the focused scheduler is
 * correct-but-narrow today; the full one is broad-and-correct later, under one API.
 *
 * @module
 */

import type { Clock } from '../clock/clock.js';
import type { Rng } from '../clock/rng.js';

/**
 * The substrate a scheduler threads into each step — the world's fixed clock and
 * seeded rng (and the seed itself, for a future scheduler that drives ordering
 * from the seed). A step reads time/randomness ONLY through these, never ambient.
 * This is the slice of the `SimWorld` (`world.ts`) a scheduler needs;
 * the world satisfies it structurally (no coupling back to the scheduler).
 */
export interface SchedulerWorld {
  /** The world's monotonic clock — for DURATIONS (fixed/advanced, never real). */
  readonly clock: Clock;
  /** The world's wall clock — for TIMESTAMPS (fixed/advanced, never real). */
  readonly wallClock: Clock;
  /** The world's seeded rng — deterministic from the seed. */
  readonly rng: Rng;
  /** The seed the world was minted from — the identity a failure replays from. */
  readonly seed: number;
}

/**
 * One observable effect a step produced — the unit a `SimTrace` (`trace.ts`)
 * is built from. `label` names the injection/observation point; `value` is the
 * step's deterministic result (content-addressed into the trace). A step that
 * fails carries the failure in `value` (e.g. a tagged-error projection) — the
 * scheduler never throws past the step boundary; a fault is data, observed in
 * order, so a failing run still produces a byte-exact trace that replays.
 */
export interface StepOutcome {
  /** The injection/observation point this outcome was emitted at. */
  readonly label: string;
  /** The deterministic value observed — folded into the trace, content-addressed. */
  readonly value: unknown;
}

/**
 * One step of a scenario — a deterministic unit of work over the world's
 * substrate. `label` names it (stable, ordered); `act` produces its observable
 * outcome value. `act` MAY be async (returns a value or a Promise of one); the
 * scheduler decides how/when it runs. It reads time/randomness ONLY through the
 * passed {@link SchedulerWorld}. A step NEVER reads ambient `Date.now()` /
 * `Math.random()` — that is exactly the nondeterminism the Level-2 meta-proof
 * injects and the DST gate catches.
 */
export interface SimStep {
  /** The stable, ordered name of this step — a trace key, not free text. */
  readonly label: string;
  /** Produce this step's observable value over the world's substrate. */
  readonly act: (world: SchedulerWorld) => unknown | Promise<unknown>;
}

/**
 * The scheduler seam. A scheduler is `{ _tag, run }` (data + a standalone drive
 * function — composition, never a class). `run` drives the steps over the world
 * and returns their outcomes in OBSERVED order. The contract every scheduler
 * upholds: given the SAME seed + SAME steps, it returns the SAME outcomes in the
 * SAME order (deterministic). The focused {@link realLoopScheduler} upholds it by
 * sequential drive; the future simulated scheduler upholds it by seed-driven
 * interleaving — both satisfy this one shape.
 */
export interface Scheduler {
  /** Discriminant — `real-loop` now; `simulated` is the documented drop-in. */
  readonly _tag: 'real-loop' | 'simulated';
  /** Drive `steps` over `world`, returning outcomes in observed order. */
  readonly run: (world: SchedulerWorld, steps: readonly SimStep[]) => Promise<readonly StepOutcome[]>;
}

/**
 * The focused scheduler that ships now: drive the steps SEQUENTIALLY on the real
 * event loop, awaiting each before starting the next, so the observed order is
 * exactly the declared order. For single-threaded sequential scenarios this is
 * fully deterministic given the world's fixed clock/rng. Reads no ambient time or
 * randomness of its own — the only nondeterminism a scheduler could add is
 * ordering, and sequential drive removes it.
 *
 * It is a pure transport: a step's own value (and any fault it observes) is passed
 * straight through into a {@link StepOutcome}. It never catches-and-swallows — a
 * step is responsible for turning its OWN failure into an observed value (faults
 * are data in this harness, see `fault.ts`); a step that throws
 * an unexpected error is a real defect and is allowed to propagate (loud, never
 * silent).
 */
export const realLoopScheduler: Scheduler = {
  _tag: 'real-loop',
  run: async (world: SchedulerWorld, steps: readonly SimStep[]): Promise<readonly StepOutcome[]> => {
    const outcomes: StepOutcome[] = [];
    for (const step of steps) {
      const value = await step.act(world);
      outcomes.push({ label: step.label, value });
    }
    return outcomes;
  },
};
