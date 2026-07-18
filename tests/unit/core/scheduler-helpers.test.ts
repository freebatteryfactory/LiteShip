/**
 * scheduler rAF-helper pins — the coalescer + SSR-guarded loop that close the
 * schedule/cancel API-shape gap the runtime skins hand-rolled ([DUP] Wave 7,
 * T143/#152).
 *
 * `rafDebounce` — one `callback` per frame, `.cancel()` drops a pending frame.
 * `startRafLoop` — SSR-guarded wall-clock driver whose `cancel` stops the loop.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rafDebounce, startRafLoop } from '@czap/core';

// A controllable `requestAnimationFrame` so the "one call per frame" law is pinned
// deterministically (the core test env is Node, where real rAF is absent).
const g = globalThis as {
  requestAnimationFrame?: (cb: FrameRequestCallback) => number;
  cancelAnimationFrame?: (id: number) => void;
};

interface RafHarness {
  readonly cbs: Map<number, FrameRequestCallback>;
  flush(ts?: number): void;
  restore(): void;
}

function installRafHarness(): RafHarness {
  const cbs = new Map<number, FrameRequestCallback>();
  let nextId = 1;
  const savedRaf = g.requestAnimationFrame;
  const savedCancel = g.cancelAnimationFrame;
  g.requestAnimationFrame = (cb: FrameRequestCallback): number => {
    const id = nextId++;
    cbs.set(id, cb);
    return id;
  };
  g.cancelAnimationFrame = (id: number): void => {
    cbs.delete(id);
  };
  return {
    cbs,
    flush(ts = 0) {
      const pending = [...cbs.values()];
      cbs.clear();
      for (const cb of pending) cb(ts);
    },
    restore() {
      g.requestAnimationFrame = savedRaf;
      g.cancelAnimationFrame = savedCancel;
    },
  };
}

describe('rafDebounce — coalescing (one callback per frame)', () => {
  let raf: RafHarness;
  beforeEach(() => {
    raf = installRafHarness();
  });
  afterEach(() => {
    raf.restore();
  });

  it('collapses a burst of triggers into a single frame callback', () => {
    const spy = vi.fn();
    const trigger = rafDebounce(spy);

    trigger();
    trigger();
    trigger();
    expect(raf.cbs.size).toBe(1); // three triggers, one pending frame
    expect(spy).not.toHaveBeenCalled();

    raf.flush();
    expect(spy).toHaveBeenCalledTimes(1); // exactly one call for the frame
  });

  it('fires once per frame across successive frames', () => {
    const spy = vi.fn();
    const trigger = rafDebounce(spy);

    trigger();
    raf.flush();
    trigger();
    trigger();
    raf.flush();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('cancel() drops a pending frame so the callback never runs', () => {
    const spy = vi.fn();
    const trigger = rafDebounce(spy);

    trigger();
    expect(raf.cbs.size).toBe(1);
    trigger.cancel();
    expect(raf.cbs.size).toBe(0);

    raf.flush();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('rafDebounce — setTimeout fallback when requestAnimationFrame is absent', () => {
  let savedRaf: typeof g.requestAnimationFrame;
  beforeEach(() => {
    savedRaf = g.requestAnimationFrame;
    g.requestAnimationFrame = undefined; // force the SSR / no-rAF branch
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    g.requestAnimationFrame = savedRaf;
  });

  it('still coalesces to one callback per tick via setTimeout', () => {
    const spy = vi.fn();
    const trigger = rafDebounce(spy);

    trigger();
    trigger();
    expect(spy).not.toHaveBeenCalled();

    vi.runAllTimers();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('startRafLoop — SSR guard', () => {
  it('starts nothing and returns a no-op cancel when requestAnimationFrame is absent', () => {
    const savedRaf = g.requestAnimationFrame;
    g.requestAnimationFrame = undefined;
    try {
      const onFrame = vi.fn();
      const cancel = startRafLoop(onFrame);
      expect(onFrame).not.toHaveBeenCalled();
      expect(() => cancel()).not.toThrow(); // the no-op cancel is safe to call
    } finally {
      g.requestAnimationFrame = savedRaf;
    }
  });
});

describe('startRafLoop — driving + cancel', () => {
  let raf: RafHarness;
  beforeEach(() => {
    raf = installRafHarness();
  });
  afterEach(() => {
    raf.restore();
  });

  it('drives onFrame with elapsed-since-start ms each frame and stops on cancel', () => {
    const onFrame = vi.fn();
    const cancel = startRafLoop(onFrame);
    expect(raf.cbs.size).toBe(1); // first frame scheduled immediately

    raf.flush(1000); // first frame: start := 1000, elapsed 0
    expect(onFrame).toHaveBeenNthCalledWith(1, 0);

    raf.flush(1016); // elapsed 16 ms since start
    expect(onFrame).toHaveBeenNthCalledWith(2, 16);

    const before = onFrame.mock.calls.length;
    cancel();
    expect(raf.cbs.size).toBe(0); // pending frame cancelled
    raf.flush(1032);
    expect(onFrame).toHaveBeenCalledTimes(before); // no further frames after cancel
  });
});
