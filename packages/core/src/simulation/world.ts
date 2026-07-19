/**
 * The SEEDED WORLD — a deterministic, FoundationDB-style simulation substrate.
 *
 * A {@link SimWorld} is a DATA record (composition, no class) that fixes every
 * source of nondeterminism behind the SAME injectable shapes the runtime already
 * threads — {@link Clock} and {@link Rng} from `@liteship/core`'s determinism
 * substrate. A real system-under-test (a quantizer, a boundary evaluator, a
 * graph-patch sequence, a worker message flow) runs UNCHANGED against the world:
 * it reads time through `world.clock` / `world.wallClock` and randomness through
 * `world.rng`, exactly as it would read `systemClock` / `wallClock` / `systemRng`
 * in production. The world simply hands it FIXED, seed-driven implementations.
 *
 * What the world fixes:
 *  - a MONOTONIC clock (for durations) advanced ONLY by the scenario/scheduler —
 *    never reads real time;
 *  - a WALL clock (for timestamps) advanced from a fixed epoch — never reads real
 *    time (no `Date.now()`, no argless `new Date()`);
 *  - a SEEDED rng (mulberry32 via {@link seededRng}) — deterministic from `seed`,
 *    never reads `Math.random()`;
 *  - a {@link FaultTable} — the declared faults a scenario injects at named points;
 *  - a {@link Scheduler} — the SEAM (default {@link realLoopScheduler}) that
 *    decides step ordering, so the full deterministic scheduler is a drop-in.
 *
 * The world reads ZERO ambient nondeterminism. Two worlds minted from the same
 * seed (and same fault table) are interchangeable — the foundation of byte-exact
 * replay (`scenario.ts`). The clocks expose an `advance` so the scenario/scheduler
 * is the ONLY thing that moves logical time, keeping a run a pure function of its
 * declared steps and seed.
 *
 * @module
 */

import { ValidationError } from '@liteship/error';
import { manualClock, type Clock, type ManualClock } from '../clock/clock.js';
import { seededRng, type Rng } from '../internal/rng.js';
import type { FaultTable } from './fault.js';
import { realLoopScheduler, type Scheduler, type SchedulerWorld } from './scheduler.js';

/**
 * The deterministic simulation world — the seed-driven substrate a scenario runs
 * against. Satisfies {@link SchedulerWorld} structurally (so a scheduler threads
 * it into steps) and adds the fault table, the scheduler seam, and the
 * manually-advanced clocks. A pure value: same `seed` + same `faults` ⇒
 * interchangeable worlds.
 */
export interface SimWorld extends SchedulerWorld {
  /** Monotonic clock for DURATIONS — manually advanced, never reads real time. */
  readonly clock: ManualClock;
  /** Wall clock for TIMESTAMPS — manually advanced from a fixed epoch. */
  readonly wallClock: ManualClock;
  /** Seeded rng — deterministic from {@link seed}. */
  readonly rng: Rng;
  /** The declared faults injectable at named points. */
  readonly faults: FaultTable;
  /** The scheduler seam — decides step ordering (default real-loop). */
  readonly scheduler: Scheduler;
  /** The seed this world was minted from — a failure's reproducible identity. */
  readonly seed: number;
}

/**
 * Options for {@link makeWorld}. All optional except the seed (passed positionally).
 * `epochMs` fixes the wall clock's start (default a stable, non-zero sentinel so
 * timestamps look real without reading the real clock); `monotonicStartMs` fixes
 * the monotonic clock's start (default 0); `faults` declares the fault table
 * (default empty); `scheduler` swaps the seam (default {@link realLoopScheduler} —
 * this is where the full FoundationDB scheduler drops in unchanged).
 */
export interface WorldOptions {
  /** Fixed wall-clock epoch start (ms). Default {@link DEFAULT_SIM_EPOCH_MS}. */
  readonly epochMs?: number;
  /** Fixed monotonic-clock start (ms). Default 0. */
  readonly monotonicStartMs?: number;
  /** The declared fault table. Default empty. */
  readonly faults?: FaultTable;
  /** The scheduler seam. Default {@link realLoopScheduler}. */
  readonly scheduler?: Scheduler;
}

/**
 * A fixed, stable, non-zero wall-clock epoch the world starts from when the caller
 * supplies none — `2025-01-01T00:00:00.000Z` in epoch ms. Chosen so simulated
 * timestamps are realistic (a real point in time, valid `new Date(ms).toISOString()`)
 * WITHOUT ever reading the real clock. It is a literal constant, not a `Date.now()`.
 */
export const DEFAULT_SIM_EPOCH_MS = 1_735_689_600_000;

/**
 * Mint a deterministic {@link SimWorld} from a seed. The seed drives the rng and
 * is carried on the world so a failing scenario replays from it. The clocks start
 * fixed and are advanced ONLY by the scenario/scheduler (so logical time is a pure
 * function of the declared steps). With no options this is a zero-fault, real-loop,
 * fixed-epoch world — the simplest deterministic substrate.
 *
 * @throws `ValidationError` when `seed` is not a finite integer (a
 * non-integer / non-finite seed cannot drive the 32-bit mulberry32 stream
 * reproducibly — parse-don't-validate, fail loud at the boundary).
 */
export function makeWorld(seed: number, options: WorldOptions = {}): SimWorld {
  if (!Number.isInteger(seed)) {
    throw ValidationError('makeWorld', `seed must be a finite integer, got ${seed}`);
  }
  const clock: ManualClock = manualClock(options.monotonicStartMs ?? 0);
  const wall: ManualClock = manualClock(options.epochMs ?? DEFAULT_SIM_EPOCH_MS);
  const rng: Rng = seededRng(seed);
  return {
    seed,
    clock,
    wallClock: wall,
    rng,
    faults: options.faults ?? [],
    scheduler: options.scheduler ?? realLoopScheduler,
  };
}

/**
 * The two clock readings a scenario may want to OBSERVE into its trace — the
 * monotonic (duration) reading and the wall (timestamp) reading, both from the
 * world's fixed clocks. A helper so a step records time WITHOUT reaching for an
 * ambient clock (the determinism law: every time read goes through the world).
 */
export function observeClocks(world: Pick<SimWorld, 'clock' | 'wallClock'>): {
  readonly monotonicMs: number;
  readonly wallMs: number;
} {
  return { monotonicMs: world.clock.now(), wallMs: world.wallClock.now() };
}

/** Re-export the substrate-facing clock type for world consumers' convenience. */
export type { Clock };
