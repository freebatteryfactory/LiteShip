/**
 * Scheduler -- clock abstraction decoupling animation from requestAnimationFrame.
 *
 * Four implementations:
 *   - raf: browser real-time (default)
 *   - noop: SSR-safe
 *   - fixedStep: deterministic timestamps at target fps (video rendering)
 *   - audioSync: ticks in lockstep with an AVBridge sample counter
 *
 * @module
 */

import type { AVBridge } from '../media/av-bridge.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SchedulerShape {
  readonly _tag: 'FrameScheduler';
  schedule(callback: (now: number) => void): number;
  cancel(id: number): void;
}

interface FixedStepShape extends SchedulerShape {
  step(): void;
  readonly frame: number;
}

// ---------------------------------------------------------------------------
// Implementations
// ---------------------------------------------------------------------------

/** Default: requestAnimationFrame. Used by Timeline/animate in browser. */
function _raf(): SchedulerShape {
  return {
    _tag: 'FrameScheduler',
    schedule: (cb) => requestAnimationFrame(cb),
    cancel: (id) => cancelAnimationFrame(id),
  };
}

/** SSR-safe: noop scheduler for server environments. */
function _noop(): SchedulerShape {
  return {
    _tag: 'FrameScheduler',
    schedule: () => 0,
    cancel: () => {},
  };
}

/** Fixed-step: deterministic timestamps at target fps. For video rendering.
 *  Uses a class for V8 hidden-class optimization (stable inline caches). */
class FixedStepSchedulerImpl implements FixedStepShape {
  readonly _tag = 'FrameScheduler' as const;
  _frame: number = 0;
  _cb: ((now: number) => void) | null = null;
  _dt: number;

  constructor(fps: number) {
    this._dt = 1000 / fps;
  }

  get frame() {
    return this._frame;
  }

  schedule(cb: (now: number) => void) {
    this._cb = cb;
    return this._frame;
  }

  cancel() {
    this._cb = null;
  }

  step() {
    const cb = this._cb;
    if (cb) {
      this._cb = null;
      cb(this._frame * this._dt);
    }
    this._frame++;
  }
}

function _fixedStep(fps: number): FixedStepShape {
  return new FixedStepSchedulerImpl(fps);
}

// ---------------------------------------------------------------------------
// Audio-sync scheduler
// ---------------------------------------------------------------------------

interface AudioSyncShape extends SchedulerShape {
  poll(): void;
  readonly frame: number;
  readonly bridge: AVBridge.Shape;
}

function _audioSync(bridge: AVBridge.Shape): AudioSyncShape {
  let lastFrame = -1;
  let pendingCallback: ((now: number) => void) | null = null;

  return {
    _tag: 'FrameScheduler',
    bridge,

    get frame() {
      return bridge.getCurrentFrame();
    },

    schedule(cb) {
      pendingCallback = cb;
      return bridge.getCurrentFrame();
    },

    cancel() {
      pendingCallback = null;
    },

    poll() {
      const currentFrame = bridge.getCurrentFrame();
      if (currentFrame !== lastFrame) {
        lastFrame = currentFrame;
        const cb = pendingCallback;
        if (cb) {
          pendingCallback = null;
          const timestampMs = bridge.sampleToTime(bridge.getCurrentSample()) * 1000;
          cb(timestampMs);
        }
      }
    },
  };
}

/**
 * Scheduler — clock abstraction that decouples animation driver from real time.
 * Pick the impl that matches the runtime: `raf` in browser, `noop` on the
 * server, `fixedStep` for deterministic video render, `audioSync` to drive UI
 * in lockstep with an {@link AVBridge}.
 */
export const Scheduler = {
  /** `requestAnimationFrame`-backed scheduler for browser real-time work. */
  raf: _raf,
  /** No-op scheduler for SSR / environments without rAF. */
  noop: _noop,
  /** Fixed-step scheduler at the given fps — deterministic timestamps for offline rendering. */
  fixedStep: _fixedStep,
  /** Scheduler that polls an {@link AVBridge} and fires callbacks when the sample frame advances. */
  audioSync: _audioSync,
};

export declare namespace Scheduler {
  /** Common structural shape every scheduler variant satisfies. */
  export type Shape = SchedulerShape;
  /** Fixed-step scheduler with manual `step()` advancement. */
  export type FixedStep = FixedStepShape;
  /** Audio-synchronized scheduler bound to an {@link AVBridge}. */
  export type AudioSync = AudioSyncShape;
}

// ---------------------------------------------------------------------------
// rAF coalescing helpers — the schedule/cancel primitives the runtime skins
// (scroll/resize rethrottle, wall-clock motion loops) all hand-rolled (T143/#152).
// ---------------------------------------------------------------------------

/** A coalescing trigger from {@link rafDebounce}: call to schedule, `.cancel()` to drop a pending frame. */
export interface RafDebouncedTrigger {
  /** Request a `callback` run on the next frame; repeated calls before it fires collapse to one. */
  (): void;
  /** Drop a pending coalesced frame, if any. Idempotent — safe to call repeatedly. */
  cancel(): void;
}

/**
 * Coalesce a burst of calls into ONE `callback` run per animation frame — the
 * rAF-throttle idiom every scroll/resize listener hand-rolled. Calling the returned
 * trigger any number of times before the next frame fires `callback` exactly once on
 * that frame; the trigger carries a `cancel()` that drops a pending frame.
 *
 * Where `requestAnimationFrame` is absent (SSR / Node / worker), it falls back to
 * `setTimeout(…, 0)`, so the once-per-tick coalescing contract still holds off the
 * browser loop.
 */
export function rafDebounce(callback: () => void): RafDebouncedTrigger {
  const hasRaf = typeof requestAnimationFrame !== 'undefined';
  let rafId: number | null = null;
  let timerId: ReturnType<typeof setTimeout> | null = null;

  const trigger = (): void => {
    if (rafId !== null || timerId !== null) return; // a frame is already pending — coalesce.
    if (hasRaf) {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        callback();
      });
    } else {
      timerId = setTimeout(() => {
        timerId = null;
        callback();
      }, 0);
    }
  };
  trigger.cancel = (): void => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  };
  return trigger;
}

/**
 * Drive `onFrame(elapsedMs)` once per animation frame with the wall-clock time
 * elapsed since the first frame — the SSR-guarded rAF loop the motion/time skins
 * hand-rolled. Returns a `cancel` that stops the loop (idempotent — safe after it
 * has already stopped).
 *
 * SSR-guarded: where `requestAnimationFrame` is absent (server / Node), it starts
 * nothing and the returned `cancel` is a no-op, so a caller never has to branch on
 * the environment.
 */
export function startRafLoop(onFrame: (elapsedMs: number) => void): () => void {
  if (typeof requestAnimationFrame === 'undefined') return () => {};
  let start: number | null = null;
  let frame: number | null = null;
  let stopped = false;
  const loop = (ts: number): void => {
    if (stopped) return;
    if (start === null) start = ts;
    onFrame(ts - start);
    if (!stopped) frame = requestAnimationFrame(loop);
  };
  frame = requestAnimationFrame(loop);
  return (): void => {
    if (stopped) return;
    stopped = true;
    if (frame !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(frame);
      frame = null;
    }
  };
}
