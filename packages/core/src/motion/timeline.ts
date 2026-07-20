/**
 * Timeline -- quantizer over time with play/pause/seek/scrub/reverse.
 *
 * A Timeline wraps a BoundaryDef and drives it from a time-based signal,
 * producing discrete state transitions as the elapsed time crosses thresholds.
 *
 * Wave 6: a transport swap onto {@link CellKernel.replay1}. The state channel's
 * hand-rolled `newState !== oldState` reference-dedup IS the product law (LOCKED
 * ruling — scar S6.F.1), so it rides EmissionPolicy `{distinct, equals: Object.is}`
 * rather than a bespoke inline guard: `setState` publishes unconditionally and the
 * kernel suppresses a consecutive-equal state. `lastEmitted` is SEEDED with the
 * initial state (a construction-time publish to zero subscribers) so the first
 * publish of the initial state is suppressed exactly as the old slot-compare guard
 * did — a faithful transport swap. The elapsed channel is a read-only closure (no
 * `changes` subscribers). `state`/`progress`/`elapsed` are sync reads; the four
 * control ops are synchronous; the scheduler cancel + kernel close are owned by a
 * {@link Lifetime}. The pure logic (Boundary.evaluate, dt integration, clamping,
 * looping) is byte-identical — only the reactive carrier changed. Behavior matches
 * the captured golden fixture (`tests/fixtures/reactive-capture/timeline.json`).
 *
 * @module
 */

import type { Millis } from '../schema/brands.js';
import { Millis as mkMillis } from '../schema/brands.js';
import { Boundary } from '../authoring/boundary.js';
import type { StateUnion } from '../internal/type-level.js';
import type { Scheduler } from '../reactive/scheduler.js';
import { Scheduler as SchedulerImpl } from '../reactive/scheduler.js';
import { CellKernel } from '../reactive/cell-kernel.js';
import type { Disposer } from '../reactive/cell-kernel.js';
import { Lifetime } from '../reactive/lifetime.js';
import { clamp01 } from '../internal/numeric.js';

interface TimelineShape<B extends Boundary = Boundary> {
  readonly boundary: B;
  /** Current boundary state (sync; was `state: Effect.Effect<StateUnion<B>>`). */
  state(): StateUnion<B>;
  /** Elapsed / duration clamped to 0..1 (sync; was `progress: Effect.Effect<number>`). */
  progress(): number;
  /** Current elapsed time in ms (sync; was `elapsed: Effect.Effect<Millis>`). */
  elapsed(): Millis;
  /**
   * Subscribe to state transitions — replays the current state on attach and
   * returns a {@link Disposer} (was `changes: Stream.Stream<StateUnion<B>>`).
   * Consecutive-equal states are suppressed (EmissionPolicy `{distinct}`).
   */
  subscribe(subscriber: CellKernel.Subscriber<StateUnion<B>>): Disposer;
  /** Start advancing on scheduler ticks (sync; was `Effect.Effect<void>`). */
  play(): void;
  /** Stop advancing (sync; was `Effect.Effect<void>`). */
  pause(): void;
  /** Flip advance direction (sync; was `Effect.Effect<void>`). */
  reverse(): void;
  /** Set elapsed directly, clamped to 0..duration (sync; was `Effect.Effect<void>`). */
  seek(ms: Millis): void;
  /** Set elapsed by progress fraction, clamped to 0..1 (sync; was `Effect.Effect<void>`). */
  scrub(progress: number): void;
  /**
   * Owns the timeline's teardown — its finalizers cancel the scheduler and close
   * the state kernel (completing subscribers), so consumers thread the timeline
   * lifecycle through one uniform `dispose()` (replacing the `Scope`-bound
   * `addFinalizer(sched.cancel)`).
   */
  readonly lifetime: Lifetime;
}

/**
 * Create a {@link Timeline} — scheduler-driven advancement over a
 * {@link Boundary}. Produces a plain reactive timeline that seeks or plays
 * between boundary states; pluggable clock via {@link Scheduler}, teardown via
 * {@link Lifetime}.
 */
export function createTimeline<B extends Boundary>(
  boundary: B,
  config?: { duration?: Millis; loop?: boolean; scheduler?: Scheduler },
): TimelineShape<B> {
  const duration =
    config?.duration ??
    (boundary.thresholds.length > 0 ? boundary.thresholds[boundary.thresholds.length - 1]! * 1.2 : 1000);
  const loop = config?.loop ?? false;

  const initialState: StateUnion<B> = Boundary.evaluate(boundary, 0);
  // The state channel: {distinct} — the hand-rolled `newState !== oldState`
  // reference-dedup is the product law (LOCKED ruling S6.F.1). Boundary states
  // are strings, so Object.is is value-equality (exactly the old `!==`).
  const stateKernel = CellKernel.replay1<StateUnion<B>>(initialState, {
    kind: 'distinct',
    equals: (a, b) => Object.is(a, b),
  });
  // Seed lastEmitted = initialState (publish to zero subscribers): the old guard
  // compared newState against the current slot (which started at initialState),
  // so a first publish of the initial state must be suppressed. This makes the
  // {distinct} transport swap byte-faithful to that slot-compare guard.
  stateKernel.publish(initialState);

  const sched =
    config?.scheduler ?? (typeof requestAnimationFrame !== 'undefined' ? SchedulerImpl.raf() : SchedulerImpl.noop());

  let lastTime: number | null = null;
  let playing = false;
  let direction: 1 | -1 = 1;
  let currentElapsed = 0;

  // Publish the state for an elapsed value; the {distinct} kernel suppresses a
  // consecutive-equal state (the former `if (newState !== oldState)` guard).
  const setState = (elapsed: number): void => {
    stateKernel.publish(Boundary.evaluate(boundary, elapsed));
  };

  let disposed = false;
  const step = (now: number): void => {
    try {
      if (lastTime !== null && playing) {
        const dt = (now - lastTime) * direction;
        let next = currentElapsed + dt;
        if (loop) {
          next = ((next % duration) + duration) % duration;
        } else {
          next = Math.max(0, Math.min(duration, next));
        }
        currentElapsed = next;
        setState(next);
      }
    } finally {
      // The tick OCCURRED (elapsed already advanced), so `lastTime` must advance and the
      // next tick must be armed even if a state subscriber THREW from `setState` — otherwise
      // one listener fault wedges the timeline forever (it stays `playing` but never ticks
      // again, and a huge `dt` would accrue if lastTime lagged). Running the bookkeeping in a
      // `finally` re-arms the scheduler while the listener error still propagates out of the
      // scheduler callback (surfaced to the host), it just no longer strands the clock.
      lastTime = now;
      // DISPOSAL-SAFE self-reschedule. A state subscriber may call
      // `timeline.lifetime.dispose()` from WITHIN `setState`; the finalizer then cancels the
      // schedId of the tick already executing (a no-op), and without this guard `step` would
      // install a fresh callback AFTER disposal — a loop that ticks forever past teardown.
      // `disposed` is monotonic, so once teardown has begun the reschedule stays blocked.
      if (!disposed) schedId = sched.schedule(step);
    }
  };
  let schedId = sched.schedule(step);

  const lifetime = Lifetime.make();
  // LIFO: cancel the scheduler first (stop future ticks), then close the state
  // kernel (complete subscribers). schedId is read at dispose time — it tracks
  // the latest reschedule, matching the old scope-bound `sched.cancel(schedId)`.
  lifetime.add(() => stateKernel.close());
  lifetime.add(() => {
    disposed = true;
    sched.cancel(schedId);
  });

  return {
    boundary,
    state: () => stateKernel.read(),
    progress: () => Math.max(0, Math.min(currentElapsed / duration, 1)),
    elapsed: () => mkMillis(currentElapsed),
    subscribe: (subscriber) => stateKernel.subscribe(subscriber),
    play: () => {
      playing = true;
    },
    pause: () => {
      playing = false;
    },
    reverse: () => {
      direction = direction === 1 ? -1 : 1;
    },
    seek: (ms: Millis) => {
      // Disposed → the state kernel is closed and `setState` is inert; advancing
      // `currentElapsed` here would move `elapsed()`/`progress()` while `state()` stays
      // frozen — a post-teardown divergence. Keep seek/scrub inert once disposed.
      if (disposed) return;
      const clamped = Math.max(0, Math.min(duration, ms));
      currentElapsed = clamped;
      setState(clamped);
    },
    scrub: (progress: number) => {
      if (disposed) return;
      const val = clamp01(progress) * duration;
      currentElapsed = val;
      setState(val);
    },
    lifetime,
  };
}

/** Public structural type for `Timeline`. */
export type Timeline<B extends Boundary = Boundary> = TimelineShape<B>;
