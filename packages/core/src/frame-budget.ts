/**
 * FrameBudget -- rAF priority lanes for frame budget management.
 *
 * Tracks remaining frame budget per animation frame and
 * schedules work by priority: `critical > high > low > idle`.
 *
 * All methods (remaining, canRun, scheduleSync) are plain synchronous JS. The rAF
 * loop's teardown is owned by a {@link Lifetime} (the disposal primitive that
 * replaces Effect's `Scope` at the shed seams): `budget.lifetime.dispose()`
 * cancels the animation frame — no Effect, no microtask.
 *
 * @module
 */

import { DEFAULT_TARGET_FPS, MS_PER_SEC } from './defaults.js';
import { type Clock, systemClock } from './clock.js';
import { Lifetime } from './lifetime.js';
import { ValidationError } from '@czap/error';

/**
 * Frame-budget priority lane in descending urgency. `critical` always runs;
 * `high` / `low` / `idle` gate based on the milliseconds remaining in the
 * current frame.
 */
export type Priority = 'critical' | 'high' | 'low' | 'idle';

// ms budget per priority lane within a 16ms frame (critical=0 runs first, high=2ms, low=6ms, idle=12ms)
const PRIORITY_THRESHOLDS: Record<Priority, number> = {
  critical: 0,
  high: 2,
  low: 6,
  idle: 12,
};

interface FrameBudgetShape {
  remaining(): number;
  canRun(priority: Priority): boolean;
  /** Synchronous scheduler for hot paths — runs `task` iff the priority lane has budget. */
  scheduleSync<A>(priority: Priority, task: () => A): A | null;
  /** Synchronous FPS accessor. */
  readonly fpsSync: number;
  /**
   * Owns the rAF loop teardown. Its sole finalizer cancels the animation frame,
   * so `dispose()` stops the frame-pacing loop.
   */
  readonly lifetime: Lifetime.Shape;
}

/**
 * Creates a FrameBudget tracker tied to rAF, with priority-based scheduling.
 * Critical tasks always run; lower priorities are deferred if budget is exhausted.
 *
 * @example
 * ```ts
 * const budget = FrameBudget.make({ targetFps: 60 });
 * const remaining = budget.remaining(); // ms left in this frame
 * const canAnimate = budget.canRun('high'); // true if enough budget
 * const result = budget.scheduleSync('low', () => 'done');
 * // result is 'done' if budget permits, null otherwise
 * budget.lifetime.dispose(); // later: cancels the rAF loop
 * ```
 */
function _make(config?: { targetFps?: number; clock?: Clock }): FrameBudgetShape {
  const targetFps = config?.targetFps ?? DEFAULT_TARGET_FPS;
  if (targetFps <= 0 || !Number.isFinite(targetFps)) {
    throw ValidationError('FrameBudget.make', `targetFps must be a positive finite number, got ${targetFps}`);
  }
  const frameBudgetMs = MS_PER_SEC / targetFps;
  // Monotonic DURATION clock for the rAF hot path (frame pacing / remaining-budget
  // deltas). Defaults to systemClock (`performance.now`); injected so a replay/test
  // can thread a deterministic `manualClock`. The rAF callback's own `now` argument
  // is itself a monotonic DOMHighResTimeStamp, so both readings are the same boundary.
  const clock = config?.clock ?? systemClock;
  // Whether a real elapsed-time source exists: an explicitly injected clock always
  // counts; otherwise the default systemClock only measures when `performance` is
  // present. Without one, `remaining()` reports the FULL budget (the SSR posture)
  // rather than decaying against a stale init reading.
  const hasTimeSource = config?.clock !== undefined || typeof performance !== 'undefined';

  const lifetime = Lifetime.make();
  let frameStart = clock.now();
  let currentFps = targetFps;
  let lastFrameTime = clock.now();
  let frameCount = 0;
  let fpsAccum = 0;

  if (typeof requestAnimationFrame !== 'undefined') {
    const tick = (now: number) => {
      frameStart = now;
      frameCount++;
      fpsAccum += now - lastFrameTime;
      lastFrameTime = now;
      if (fpsAccum >= MS_PER_SEC) {
        currentFps = Math.round((frameCount * MS_PER_SEC) / fpsAccum);
        frameCount = 0;
        fpsAccum %= MS_PER_SEC;
      }
      rafId = requestAnimationFrame(tick);
    };
    let rafId = requestAnimationFrame(tick);
    // The rAF loop's teardown, owned by the Lifetime (was Effect.addFinalizer).
    lifetime.add(() => cancelAnimationFrame(rafId));
  }

  const budget: FrameBudgetShape = {
    remaining(): number {
      if (!hasTimeSource) return frameBudgetMs;
      return Math.max(0, frameBudgetMs - (clock.now() - frameStart));
    },

    canRun(priority: Priority): boolean {
      const rem = budget.remaining();
      return rem >= PRIORITY_THRESHOLDS[priority]!;
    },

    scheduleSync<A>(priority: Priority, task: () => A): A | null {
      if (budget.canRun(priority) || priority === 'critical') {
        return task();
      }
      return null;
    },

    get fpsSync(): number {
      return currentFps;
    },

    lifetime,
  };

  return budget;
}

/**
 * FrameBudget -- rAF-based frame budget manager with priority lanes.
 * Tracks remaining time per animation frame and gates work by priority:
 * `critical` (always runs) `> high > low > idle`.
 *
 * @example
 * ```ts
 * const budget = FrameBudget.make({ targetFps: 60 });
 * if (budget.canRun('high')) {
 *   budget.scheduleSync('high', () => render());
 * }
 * const fps = budget.fpsSync; // current measured FPS
 * ```
 */
export const FrameBudget = { make: _make };

export declare namespace FrameBudget {
  /** Structural shape of a {@link FrameBudget} instance — `canRun`, `scheduleSync`, `remaining`, `fpsSync`, `lifetime`. */
  export type Shape = FrameBudgetShape;
}
