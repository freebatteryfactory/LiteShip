/**
 * Animation -- rAF-driven frame generation + value lerping.
 *
 * Produces an `AsyncIterable` of AnimationFrame values driven by
 * requestAnimationFrame (or an injected {@link Scheduler}), with configurable
 * duration and easing. Also provides numeric record interpolation for smooth
 * state transitions.
 *
 * @module
 */

import type { Millis } from './brands.js';
import { Millis as mkMillis } from './brands.js';
import type { Easing } from './easing.js';
import { Easing as EasingImpl } from './easing.js';
import type { Scheduler } from './scheduler.js';
import { Scheduler as SchedulerImpl } from './scheduler.js';
import { interpolate } from './interpolate.js';

interface AnimationFrameShape {
  readonly progress: number;
  readonly eased: number;
  readonly elapsed: Millis;
  readonly timestamp: number;
}

/**
 * The pure per-tick kernel — map an elapsed offset (ms since start) to a
 * {@link Animation.Frame}. Byte-identical to the pre-transport `tick` body:
 * progress clamps at 1, `eased` is the easing evaluated at that progress, and
 * `elapsed` carries the {@link Millis} brand. Extracted so the frame math is
 * independent of the carrier (Stream → async generator was a transport swap).
 */
function sampleFrame(elapsed: number, duration: number, easing: Easing.Fn, timestamp: number): AnimationFrameShape {
  const progress = Math.min(elapsed / duration, 1);
  const eased = easing(progress);
  return { progress, eased, elapsed: mkMillis(elapsed), timestamp };
}

/**
 * Run a finite animation as an `AsyncIterable` of {@link Animation.Frame}
 * values driven by requestAnimationFrame (or an injected {@link Scheduler}).
 * Emits frames from progress 0 to 1; a non-positive duration yields exactly one
 * completed frame.
 *
 * The generator is a single-consumer pull clock: each iteration schedules ONE
 * tick and awaits it, so at most one frame callback is ever outstanding. Its
 * `finally` cancels that pending tick when the animation completes (progress
 * reaches 1) OR when the consumer stops early (a `for await` `break`, which
 * invokes the generator's `return`) — the replacement for the old Effect scope
 * finalizer (`addFinalizer(sched.cancel)`).
 */
async function* _run(config: {
  duration: Millis;
  easing?: Easing.Fn;
  scheduler?: Scheduler.Shape;
  signal?: AbortSignal;
}): AsyncGenerator<AnimationFrameShape, void, void> {
  const { duration, easing = EasingImpl.linear, signal } = config;

  if (signal?.aborted) return;

  if (duration <= 0) {
    yield { progress: 1, eased: easing(1), elapsed: mkMillis(0), timestamp: 0 };
    return;
  }

  const sched =
    config.scheduler ?? (typeof requestAnimationFrame !== 'undefined' ? SchedulerImpl.raf() : SchedulerImpl.noop());

  let startTime: number | null = null;
  // Id of the currently-pending scheduled tick — cancelled on teardown so no
  // frame callback dangles after the generator finishes or is stopped early.
  let schedId = 0;

  try {
    while (true) {
      if (signal?.aborted) return;
      // Bridge the push-based scheduler onto the pull-based generator: schedule
      // one tick, await the timestamp it fires with. `finish` IS the frame callback
      // the scheduler stores under `schedId`. An optional `signal` RACES the tick:
      // without it, a suspended await on an UNDRIVEN clock (SSR `Scheduler.noop`, or
      // a fixed-step / audio clock no longer ticked) never resolves, so the
      // consumer's `return()`/cancellation queues behind the pending read forever and
      // `finally` never runs. On abort the read settles (NaN) so the loop observes
      // the abort and reaches the scheduler cancel. `finish` is idempotent and clears
      // its own abort listener, so exactly one of {tick, abort} wins per frame.
      const timestamp = await new Promise<number>((resolve) => {
        let settled = false;
        let onAbort: (() => void) | undefined;
        const finish = (now: number): void => {
          if (settled) return;
          settled = true;
          if (onAbort !== undefined) signal?.removeEventListener('abort', onAbort);
          resolve(now);
        };
        schedId = sched.schedule(finish);
        if (signal !== undefined) {
          if (signal.aborted) {
            finish(Number.NaN);
          } else {
            onAbort = (): void => finish(Number.NaN);
            signal.addEventListener('abort', onAbort, { once: true });
          }
        }
      });

      if (signal?.aborted) return;
      if (startTime === null) startTime = timestamp;
      const frame = sampleFrame(timestamp - startTime, duration, easing, timestamp);
      yield frame;

      // Terminal frame — stop (was `Queue.endUnsafe` at progress >= 1).
      if (frame.progress >= 1) return;
    }
  } finally {
    sched.cancel(schedId);
  }
}

/**
 * Animation — rAF-driven value interpolation exposed as an `AsyncIterable`.
 * Pairs a duration and easing with either primitive lerping or the generic
 * {@link Animation.interpolate} over numeric records.
 */
export const Animation = {
  /** Run an rAF animation that yields an async iterable of {@link Animation.Frame}. */
  run: _run,
  /** Shallow numeric-record interpolator; non-numeric keys pass through. */
  interpolate,
};

export declare namespace Animation {
  /** Structural shape of a single frame emitted by {@link Animation.run}. */
  export type Frame = AnimationFrameShape;
}
