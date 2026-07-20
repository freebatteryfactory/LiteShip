import { afterEach, describe, expect, test, vi } from 'vitest';
import { Animation, Millis, Scheduler, Easing } from '@liteship/core';
import { hasTag } from '@liteship/error';
import { interpolate as rawInterpolate } from '../../../../packages/core/src/motion/interpolate.js';

// ---------------------------------------------------------------------------
// Deterministic drivers for the async-generator animation clock.
//
// Animation.run is now an AsyncIterable<Frame> driven by Scheduler.schedule /
// cancel, so the tests drive it with a MANUAL clock: each scheduled tick fires
// exactly once — on a microtask — with the next programmed timestamp. A plain
// `for await` then pulls the whole animation to completion with no real timers
// and no Date, and the generator's own `finally` cancels the last pending tick.
// ---------------------------------------------------------------------------

/**
 * Settle past one macrotask so every queued microtask (and thus any pending
 * frame callback) has run. Clock-free and deterministic.
 */
async function settle(): Promise<void> {
  await new Promise<void>((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      channel.port2.close();
      resolve();
    };
    channel.port2.postMessage(undefined);
  });
}

/**
 * A manual frame clock: every scheduled tick fires once, on a microtask, with
 * the next timestamp from `timestamps` (the final value repeats if exhausted).
 * `cancel` is a spy so the teardown law — cancel the last pending tick — is
 * observable. Deterministic: no real timers, no Date.
 */
function manualClock(timestamps: readonly number[]): {
  scheduler: Scheduler;
  cancel: ReturnType<typeof vi.fn>;
} {
  let index = 0;
  let nextId = 1;
  const cancelled = new Set<number>();
  const cancel = vi.fn((id: number) => {
    cancelled.add(id);
  });
  const scheduler: Scheduler = {
    _tag: 'FrameScheduler',
    schedule: (callback: (now: number) => void) => {
      const id = nextId++;
      const at = timestamps[index] ?? timestamps[timestamps.length - 1] ?? 0;
      index++;
      queueMicrotask(() => {
        if (!cancelled.has(id)) callback(at);
      });
      return id;
    },
    cancel,
  };
  return { scheduler, cancel };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Animation.run', () => {
  test('emits a single completed frame for zero-duration animations', async () => {
    const frames: Animation.Frame[] = [];
    for await (const frame of Animation.run({ duration: Millis(0) })) frames.push(frame);

    expect(frames).toHaveLength(1);
    expect(frames[0]?.progress).toBe(1);
    expect(frames[0]?.elapsed).toBe(0);
    expect(frames[0]?.timestamp).toBe(0);
  });

  test('accepts a custom scheduler configuration without changing zero-duration behavior', async () => {
    const scheduler = Scheduler.fixedStep(4);
    const frames: Animation.Frame[] = [];
    for await (const frame of Animation.run({ duration: Millis(0), easing: (t) => t * t, scheduler })) {
      frames.push(frame);
    }

    expect(frames).toHaveLength(1);
    expect(frames[0]?.eased).toBe(1);
  });

  test('runs finite animations with a custom scheduler until completion', async () => {
    const { scheduler, cancel } = manualClock([0, 250, 500]);

    const frames: Animation.Frame[] = [];
    for await (const frame of Animation.run({ duration: Millis(500), easing: (t) => t * t, scheduler })) {
      frames.push(frame);
    }

    expect(frames.map((frame) => frame.progress)).toEqual([0, 0.5, 1]);
    expect(frames[1]?.eased).toBeCloseTo(0.25);
    // The last scheduled tick (id 3) is cancelled by the generator's finally.
    expect(cancel).toHaveBeenCalledWith(3);
  });

  test('defaults to browser requestAnimationFrame scheduling when available', async () => {
    const timestamps = [0, 16, 32];
    let index = 0;
    let nextId = 1;
    const cancelled = new Set<number>();
    const cancelAnimationFrameSpy = vi.fn((id: number) => {
      cancelled.add(id);
    });

    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        const id = nextId++;
        const at = timestamps[index] ?? timestamps[timestamps.length - 1] ?? 0;
        index++;
        queueMicrotask(() => {
          if (!cancelled.has(id)) callback(at);
        });
        return id;
      }),
    );
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrameSpy);

    const frames: Animation.Frame[] = [];
    for await (const frame of Animation.run({ duration: Millis(32) })) frames.push(frame);

    expect(frames.map((frame) => frame.timestamp)).toEqual([0, 16, 32]);
    expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(3);
  });

  test('never completes with the noop scheduler when requestAnimationFrame is unavailable', async () => {
    vi.stubGlobal('requestAnimationFrame', undefined);
    vi.stubGlobal('cancelAnimationFrame', undefined);

    const iterator = Animation.run({ duration: Millis(10) });
    let settled = false;
    void iterator.next().then(() => {
      settled = true;
    });

    await settle();

    // The noop scheduler never fires its callback, so the animation never
    // advances — the first pull stays pending forever (the old timeout law).
    expect(settled).toBe(false);
  });

  test('an abort signal settles the pending read under an undriven scheduler (cancellation is not deadlocked)', async () => {
    // With an undriven clock (`Scheduler.noop`, or a fixed-step/audio clock no longer
    // ticked) the first pull parks on the scheduled read forever, so a bare `return()`
    // can never reach `finally`. An AbortSignal RACES that read: aborting settles it,
    // the loop observes the abort and returns (done) — cancellation is no longer queued
    // behind a read that will never resolve.
    const controller = new AbortController();
    const iterator = Animation.run({ duration: Millis(1000), scheduler: Scheduler.noop(), signal: controller.signal });

    const pull = iterator.next();
    let done: boolean | undefined;
    void pull.then((r) => {
      done = r.done;
    });

    await settle();
    expect(done).toBeUndefined(); // still parked — the noop clock never fires

    controller.abort();
    const result = await pull; // resolves now instead of hanging forever
    expect(result.done).toBe(true);
    expect(done).toBe(true);
  });
});

describe('Animation.interpolate', () => {
  test('lerps shared keys and fills keys that exist only in the target record', () => {
    expect(Animation.interpolate({ opacity: 0, scale: 0.5 }, { opacity: 1, rotate: 90 }, 0.5)).toEqual({
      opacity: 0.5,
      rotate: 45,
      scale: 0.5,
    });
  });

  test('ignores inherited enumerable target keys when filling missing properties', () => {
    const inheritedTarget = Object.create({ rotate: 90 }) as Record<string, number>;
    inheritedTarget.opacity = 1;

    expect(Animation.interpolate({ opacity: 0 }, inheritedTarget, 0.5)).toEqual({
      opacity: 0.5,
    });
  });

  test('raw interpolate only fills own target keys that are missing from the result', () => {
    const inheritedTarget = Object.create({ rotate: 90 }) as Record<string, number>;
    inheritedTarget.opacity = 1;

    expect(rawInterpolate({ opacity: 0 }, inheritedTarget, 0.5)).toEqual({
      opacity: 0.5,
    });
    expect(rawInterpolate({ opacity: 0 }, { opacity: 1, rotate: 90 }, 0.5)).toEqual({
      opacity: 0.5,
      rotate: 45,
    });
  });

  test('raw interpolate respects explicit defaults for keys that only exist in the target record', () => {
    expect(rawInterpolate({ opacity: 0 }, { opacity: 1, rotate: 90 }, 0.5, { rotate: 10 })).toEqual({
      opacity: 0.5,
      rotate: 50,
    });
  });
});

// ---------------------------------------------------------------------------
// Easing.spring input validation
// ---------------------------------------------------------------------------

describe('Easing.spring input validation', () => {
  function expectValidationError(fn: () => unknown): void {
    try {
      fn();
      expect.unreachable('expected a ValidationError to be thrown');
    } catch (error) {
      expect(hasTag(error, 'ValidationError')).toBe(true);
    }
  }

  test('throws ValidationError when stiffness is 0', () => {
    expectValidationError(() => Easing.spring({ stiffness: 0, damping: 10 }));
  });

  test('throws ValidationError when stiffness is negative', () => {
    expectValidationError(() => Easing.spring({ stiffness: -1, damping: 10 }));
  });

  test('throws ValidationError when mass is 0', () => {
    expectValidationError(() => Easing.spring({ stiffness: 200, damping: 10, mass: 0 }));
  });

  test('throws ValidationError when mass is negative', () => {
    expectValidationError(() => Easing.spring({ stiffness: 200, damping: 10, mass: -1 }));
  });

  test('throws ValidationError when damping is negative', () => {
    expectValidationError(() => Easing.spring({ stiffness: 200, damping: -1 }));
  });

  test('does not throw when damping is 0 (undamped)', () => {
    expect(() => Easing.spring({ stiffness: 200, damping: 0 })).not.toThrow();
  });

  test('does not throw for valid config without explicit mass', () => {
    expect(() => Easing.spring({ stiffness: 200, damping: 10 })).not.toThrow();
  });

  test('springNaturalDuration throws ValidationError for stiffness 0', () => {
    expectValidationError(() => Easing.springNaturalDuration({ stiffness: 0, damping: 10 }));
  });

  test('springNaturalDuration throws ValidationError for Infinity stiffness', () => {
    expectValidationError(() => Easing.springNaturalDuration({ stiffness: Infinity, damping: 10 }));
  });
});
