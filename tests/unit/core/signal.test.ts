// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { AVBridge, Signal, manualClock, fixedClock } from '@liteship/core';

/**
 * Signal — Wave 6 plain CellKernel transport (Effect-free). RED-FIRST law table
 * for the swap onto {@link CellKernel.replay1}: plain factories (`Signal.make`/
 * `controllable`/`audio`) returning a `{ read, subscribe, lifetime }` handle;
 * `current` (Effect) → sync `read()`; `changes` (Stream) → `subscribe(sink)`;
 * `seek`/`pause`/`resume`/`poll` sync; DOM/rAF/interval listeners publish directly
 * and their teardown is owned by the `Lifetime` (asserted via `lifetime.dispose()`).
 * `Signal.audio`'s eager-throw is preserved. Value behavior matches the Wave 5.5
 * capture (`tests/fixtures/reactive-capture/signal.json`).
 */

describe('Signal.make', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    Object.defineProperty(window, 'innerWidth', { value: 800, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });
    Object.defineProperty(window, 'scrollX', { value: 0, configurable: true });
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  test('tracks viewport width changes', () => {
    const signal = Signal.make({ type: 'viewport', axis: 'width' });
    expect(signal.read()).toBe(800);
  });

  test('tracks viewport height resize events and cleans up the listener', async () => {
    const removeListener = vi.spyOn(window, 'removeEventListener');

    const signal = Signal.make({ type: 'viewport', axis: 'height' });
    Object.defineProperty(window, 'innerHeight', { value: 720, configurable: true });
    window.dispatchEvent(new Event('resize'));

    expect(signal.read()).toBe(720);

    await signal.lifetime.dispose();
    expect(removeListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  test('tracks viewport width resize events through the width branch', () => {
    const signal = Signal.make({ type: 'viewport', axis: 'width' });
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
    window.dispatchEvent(new Event('resize'));

    expect(signal.read()).toBe(1024);
  });

  test('computes scroll progress and reacts to scroll events', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 2000, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true });
    Object.defineProperty(window, 'scrollY', { value: 250, configurable: true });

    const signal = Signal.make({ type: 'scroll', axis: 'progress' });
    expect(signal.read()).toBeCloseTo(0.25);
  });

  test('tracks scroll axes and zero-progress ranges', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 600, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });

    const xSignal = Signal.make({ type: 'scroll', axis: 'x' });
    const ySignal = Signal.make({ type: 'scroll', axis: 'y' });
    const progressSignal = Signal.make({ type: 'scroll', axis: 'progress' });

    Object.defineProperty(window, 'scrollX', { value: 120, configurable: true });
    Object.defineProperty(window, 'scrollY', { value: 240, configurable: true });
    window.dispatchEvent(new Event('scroll'));

    expect({ x: xSignal.read(), y: ySignal.read(), progress: progressSignal.read() }).toEqual({
      x: 120,
      y: 240,
      progress: 0,
    });
  });

  test('updates scroll progress through the positive-range event path', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 2000, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 1000, configurable: true });

    const signal = Signal.make({ type: 'scroll', axis: 'progress' });
    Object.defineProperty(window, 'scrollY', { value: 500, configurable: true });
    window.dispatchEvent(new Event('scroll'));

    expect(signal.read()).toBeCloseTo(0.5);
  });

  test('tracks pointer updates', () => {
    const signal = Signal.make({ type: 'pointer', axis: 'pressure' });
    expect(signal.read()).toBe(0);
  });

  test('tracks pointer axes and cleans up pointer listeners', async () => {
    const removeListener = vi.spyOn(window, 'removeEventListener');

    const xSignal = Signal.make({ type: 'pointer', axis: 'x' });
    const ySignal = Signal.make({ type: 'pointer', axis: 'y' });
    const pressureSignal = Signal.make({ type: 'pointer', axis: 'pressure' });

    const event = new MouseEvent('pointermove', { clientX: 48, clientY: 96 });
    Object.defineProperty(event, 'pressure', { value: 0.75, configurable: true });
    window.dispatchEvent(event);

    expect({ x: xSignal.read(), y: ySignal.read(), pressure: pressureSignal.read() }).toEqual({
      x: 48,
      y: 96,
      pressure: 0.75,
    });

    await xSignal.lifetime.dispose();
    expect(removeListener).toHaveBeenCalledWith('pointermove', expect.any(Function));
  });

  test('tracks media-query changes', () => {
    const mql = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => mql),
    });

    const signal = Signal.make({ type: 'media', query: '(prefers-reduced-motion: reduce)' });
    expect(signal.read()).toBe(0);
  });

  test('tracks media-query listeners through match changes and cleanup', async () => {
    let changeListener: ((event: MediaQueryListEvent) => void) | undefined;
    const mql = {
      matches: true,
      addEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => {
        changeListener = listener;
      }),
      removeEventListener: vi.fn(),
    };

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => mql),
    });

    const signal = Signal.make({ type: 'media', query: '(prefers-color-scheme: dark)' });
    changeListener?.({ matches: false } as MediaQueryListEvent);

    expect(signal.read()).toBe(0);
    expect(mql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    await signal.lifetime.dispose();
    expect(mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  test('covers additional initial branches for viewport height, scroll axes, and matching media queries', () => {
    Object.defineProperty(window, 'innerHeight', { value: 640, configurable: true });
    Object.defineProperty(window, 'scrollX', { value: 32, configurable: true });
    Object.defineProperty(window, 'scrollY', { value: 96, configurable: true });
    Object.defineProperty(document.documentElement, 'scrollHeight', { value: 1_640, configurable: true });

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    const viewport = Signal.make({ type: 'viewport', axis: 'height' });
    const scrollX = Signal.make({ type: 'scroll', axis: 'x' });
    const scrollY = Signal.make({ type: 'scroll', axis: 'y' });
    const media = Signal.make({ type: 'media', query: '(prefers-contrast: more)' });

    expect({
      viewport: viewport.read(),
      scrollX: scrollX.read(),
      scrollY: scrollY.read(),
      media: media.read(),
    }).toEqual({ viewport: 640, scrollX: 32, scrollY: 96, media: 1 });
  });

  test('updates absolute time signals on their interval', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    const signal = Signal.make({ type: 'time', mode: 'absolute' });
    const initial = signal.read();

    vi.advanceTimersByTime(1000);

    expect(signal.read()).toBe(initial + 1000);
  });

  test('updates elapsed time signals with requestAnimationFrame and cancels the latest frame on cleanup', async () => {
    const callbacks = new Map<number, FrameRequestCallback>();
    let nextId = 1;
    let currentTime = 1_000;

    vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

    const requestAnimationFrameSpy = vi.fn((callback: FrameRequestCallback) => {
      const id = nextId++;
      callbacks.set(id, callback);
      return id;
    });
    const cancelAnimationFrameSpy = vi.fn((id: number) => {
      callbacks.delete(id);
    });

    vi.stubGlobal('requestAnimationFrame', requestAnimationFrameSpy);
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrameSpy);

    // Listeners attach synchronously in make(): the rAF loop is armed immediately.
    const signal = Signal.make({ type: 'time', mode: 'elapsed' });

    currentTime = 1_000;
    callbacks.get(1)?.(1_000);
    currentTime = 1_060;
    callbacks.get(2)?.(1_060);

    expect(signal.read()).toBe(60);
    expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(3);

    await signal.lifetime.dispose();
    expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(3);
  });

  test('elapsed rAF loop does NOT re-arm when a subscriber disposes from INSIDE the tick', () => {
    // Disposal-resurrection race: a value subscriber disposes the signal from within
    // the tick's publish. The finalizer cancels the frame id of the tick already
    // executing (a no-op) — without the monotonic `disposed` guard, tick() would then
    // schedule a FRESH frame after disposal, an inert-publish loop that never dies.
    const callbacks = new Map<number, FrameRequestCallback>();
    let nextId = 1;
    let currentTime = 1_000;
    vi.spyOn(Date, 'now').mockImplementation(() => currentTime);
    const rafSpy = vi.fn((cb: FrameRequestCallback) => {
      const id = nextId++;
      callbacks.set(id, cb);
      return id;
    });
    const cafSpy = vi.fn((id: number) => {
      callbacks.delete(id);
    });
    vi.stubGlobal('requestAnimationFrame', rafSpy);
    vi.stubGlobal('cancelAnimationFrame', cafSpy);

    const signal = Signal.make({ type: 'time', mode: 'elapsed' });
    expect(rafSpy).toHaveBeenCalledTimes(1); // frame 1 armed synchronously in make()

    // Dispose from within the TICK delivery only (guard on elapsed > 0 so the
    // replay-on-subscribe of the initial 0 does not trip it).
    signal.subscribe((v) => {
      if (v > 0) void signal.lifetime.dispose();
    });

    currentTime = 1_060;
    callbacks.get(1)?.(1_060); // fires the tick → positive elapsed → subscriber disposes

    // The loop is DEAD: no frame scheduled after disposal (still just the initial arm).
    expect(rafSpy).toHaveBeenCalledTimes(1);
    expect(callbacks.has(2)).toBe(false);
    expect(signal.lifetime.disposed).toBe(true);
  });

  test('elapsed rAF loop RE-ARMS the next frame even when a subscriber throws in the tick', () => {
    // Exception-safety: a subscriber fault during publish must not permanently
    // freeze the signal. The tick re-arms the next frame in a `finally`, the fault
    // still surfaces (propagates out of the rAF callback), and once the faulty
    // subscription is removed the loop keeps advancing.
    const callbacks = new Map<number, FrameRequestCallback>();
    let nextId = 1;
    let currentTime = 1_000;
    vi.spyOn(Date, 'now').mockImplementation(() => currentTime);
    const rafSpy = vi.fn((cb: FrameRequestCallback) => {
      const id = nextId++;
      callbacks.set(id, cb);
      return id;
    });
    vi.stubGlobal('requestAnimationFrame', rafSpy);
    vi.stubGlobal('cancelAnimationFrame', (id: number) => callbacks.delete(id));

    const signal = Signal.make({ type: 'time', mode: 'elapsed' });
    expect(rafSpy).toHaveBeenCalledTimes(1); // frame 1 armed synchronously in make()

    const boom = new Error('subscriber boom');
    const remove = signal.subscribe((v) => {
      if (v > 0) throw boom;
    });

    // Fire frame 1: positive elapsed → subscriber throws. The fault surfaces...
    currentTime = 1_060;
    expect(() => callbacks.get(1)!(1_060)).toThrow(boom);
    // ...but the next frame WAS re-armed despite the throw (not frozen).
    expect(rafSpy).toHaveBeenCalledTimes(2);
    expect(callbacks.has(2)).toBe(true);

    // With the faulty subscription removed, the loop keeps advancing cleanly.
    remove();
    let last = -1;
    signal.subscribe((v) => {
      last = v;
    });
    currentTime = 1_100;
    callbacks.get(2)!(1_100);
    expect(last).toBe(100);
    expect(rafSpy).toHaveBeenCalledTimes(3);

    void signal.lifetime.dispose();
  });

  test('leaves elapsed time signals inert when requestAnimationFrame is unavailable', () => {
    vi.stubGlobal('requestAnimationFrame', undefined);

    const signal = Signal.make({ type: 'time', mode: 'elapsed' });
    expect(signal.read()).toBe(0);
  });

  test('leaves scheduled time signals under external control', () => {
    const signal = Signal.make({ type: 'time', mode: 'scheduled' });
    expect(signal.read()).toBe(0);
  });

  test('returns the default value for custom signals', () => {
    const signal = Signal.make({ type: 'custom', id: 'search-query' });
    expect(signal.read()).toBe(0);
  });

  test('returns the default value for audio source placeholders', () => {
    const signal = Signal.make({ type: 'audio', mode: 'normalized' });
    expect(signal.read()).toBe(0);
  });

  test('runs scheduled, custom, and audio setup paths without attaching browser listeners', () => {
    const addListener = vi.spyOn(window, 'addEventListener');

    const scheduled = Signal.make({ type: 'time', mode: 'scheduled' });
    const custom = Signal.make({ type: 'custom', id: 'runtime-mode' });
    const audio = Signal.make({ type: 'audio', mode: 'sample' });

    expect({ scheduled: scheduled.read(), custom: custom.read(), audio: audio.read() }).toEqual({
      scheduled: 0,
      custom: 0,
      audio: 0,
    });
    expect(addListener).not.toHaveBeenCalledWith('resize', expect.any(Function));
    expect(addListener).not.toHaveBeenCalledWith('scroll', expect.any(Function), expect.anything());
    expect(addListener).not.toHaveBeenCalledWith('pointermove', expect.any(Function));
  });

  test('gracefully leaves browser-driven signals inert when window is unavailable', () => {
    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;

    vi.stubGlobal('window', undefined);
    vi.stubGlobal('document', undefined);

    try {
      const viewport = Signal.make({ type: 'viewport', axis: 'width' });
      const scroll = Signal.make({ type: 'scroll', axis: 'progress' });
      const pointer = Signal.make({ type: 'pointer', axis: 'pressure' });
      const media = Signal.make({ type: 'media', query: '(prefers-color-scheme: dark)' });

      expect({
        viewport: viewport.read(),
        scroll: scroll.read(),
        pointer: pointer.read(),
        media: media.read(),
      }).toEqual({ viewport: 0, scroll: 0, pointer: 0, media: 0 });
    } finally {
      vi.stubGlobal('window', originalWindow);
      vi.stubGlobal('document', originalDocument);
    }
  });

  test('covers no-window setup branches and positive media transitions with explicit listener setup', () => {
    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;

    vi.stubGlobal('window', undefined);
    vi.stubGlobal('document', undefined);

    try {
      const viewport = Signal.make({ type: 'viewport', axis: 'height' });
      const scroll = Signal.make({ type: 'scroll', axis: 'x' });
      const pointer = Signal.make({ type: 'pointer', axis: 'x' });
      const media = Signal.make({ type: 'media', query: '(prefers-reduced-motion: reduce)' });

      expect({
        viewport: viewport.read(),
        scroll: scroll.read(),
        pointer: pointer.read(),
        media: media.read(),
      }).toEqual({ viewport: 0, scroll: 0, pointer: 0, media: 0 });
    } finally {
      vi.stubGlobal('window', originalWindow);
      vi.stubGlobal('document', originalDocument);
    }

    let changeListener: ((event: MediaQueryListEvent) => void) | undefined;
    const mql = {
      matches: false,
      addEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => {
        changeListener = listener;
      }),
      removeEventListener: vi.fn(),
    };

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => mql),
    });

    const signal = Signal.make({ type: 'media', query: '(prefers-contrast: more)' });
    changeListener?.({ matches: true } as MediaQueryListEvent);

    expect(signal.read()).toBe(1);
  });
});

describe('Signal.make time-elapsed', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  test('time-elapsed signal starts a requestAnimationFrame loop and cleans up on dispose', async () => {
    const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame');
    const cafSpy = vi.spyOn(globalThis, 'cancelAnimationFrame');

    const signal = Signal.make({ type: 'time', mode: 'elapsed' });

    expect(signal.read()).toBeGreaterThanOrEqual(0);
    expect(rafSpy).toHaveBeenCalled();

    await signal.lifetime.dispose();
    expect(cafSpy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// subscribe — replay-1 + emit-every-set on the value channel ({all})
// ---------------------------------------------------------------------------

describe('Signal.controllable — subscribe replays + emits every seek ({all})', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('subscribe replays the current value; every seek fans out (no dedup)', () => {
    const signal = Signal.controllable();
    const got: number[] = [];
    signal.subscribe((v) => got.push(v));
    signal.seek(7);
    signal.seek(7);
    signal.seek(7);
    expect(got).toEqual([0, 7, 7, 7]);
    expect(signal.read()).toBe(7);
  });

  test('a late subscriber replays only the latest value', () => {
    const signal = Signal.controllable();
    signal.seek(3);
    signal.seek(5);
    const got: number[] = [];
    signal.subscribe((v) => got.push(v));
    expect(got).toEqual([5]);
  });
});

describe('Signal.controllable', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('seek, pause, and resume control scheduled time updates', () => {
    const signal = Signal.controllable();

    signal.seek(100);
    signal.pause();
    signal.seek(200); // ignored while paused
    signal.resume();
    signal.seek(300);

    expect(signal.read()).toBe(300);
  });

  test('a seek issued while paused does not fan out to subscribers', () => {
    const signal = Signal.controllable();
    const got: number[] = [];
    signal.subscribe((v) => got.push(v));
    signal.pause();
    signal.seek(5); // ignored
    signal.resume();
    signal.seek(6);
    expect(got).toEqual([0, 6]);
  });
});

describe('Signal.audio', () => {
  test('poll returns the raw sample count in sample mode', () => {
    const bridge = AVBridge.make({ sampleRate: 48_000, fps: 60 });
    bridge.advanceSamples(2400);

    const signal = Signal.audio(bridge);
    expect(signal.poll()).toBe(2400);
  });

  test('poll normalizes audio progress against total duration', () => {
    const bridge = AVBridge.make({ sampleRate: 48_000, fps: 60 });
    bridge.advanceSamples(24_000);

    const signal = Signal.audio(bridge, 'normalized', 1);
    expect(signal.poll()).toBeCloseTo(0.5);
  });

  test('normalized mode without a positive totalDurationSec throws SYNCHRONOUSLY (eager-throw preserved)', () => {
    const bridge = AVBridge.make({ sampleRate: 48_000, fps: 60 });

    expect(() => Signal.audio(bridge, 'normalized')).toThrow(/totalDurationSec/);
    expect(() => Signal.audio(bridge, 'normalized', 0)).toThrow(/totalDurationSec/);
    expect(() => Signal.audio(bridge, 'normalized', Number.NaN)).toThrow(/totalDurationSec/);
  });
});

// ---------------------------------------------------------------------------
// Injected-clock determinism — an elapsed/absolute time Signal driven by a
// manual/fixed Clock produces its values as a pure function of the clock's
// advances. No Date mocking; the ambient wall clock is never read.
// ---------------------------------------------------------------------------

describe('Signal.make — injected clock determinism', () => {
  test('elapsed time signal reports clock.now() - start via the INJECTED clock, no Date mock', () => {
    const callbacks = new Map<number, FrameRequestCallback>();
    let nextId = 1;
    const rafSpy = vi.fn((cb: FrameRequestCallback) => {
      const id = nextId++;
      callbacks.set(id, cb);
      return id;
    });
    vi.stubGlobal('requestAnimationFrame', rafSpy);
    vi.stubGlobal('cancelAnimationFrame', (id: number) => callbacks.delete(id));
    // A Date that would DISAGREE with the injected clock if it were consulted.
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(500_000);

    const clock = manualClock(1_000); // start = 1000, independent of Date.now()
    const signal = Signal.make({ type: 'time', mode: 'elapsed' }, clock);
    const values: number[] = [];
    signal.subscribe((v) => values.push(v));

    clock.advance(16);
    callbacks.get(1)?.(0); // rAF timestamp arg is ignored; the signal reads the clock
    clock.advance(16);
    callbacks.get(2)?.(0);

    // Elapsed = clock.now() - start = 16, then 32 — from the injected clock only.
    expect(values).toEqual([0, 16, 32]);
    // Date.now() was never the source of the elapsed value.
    expect(dateSpy).not.toHaveBeenCalled();

    void signal.lifetime.dispose();
  });

  test('absolute time signal seeds its initial value from the injected clock', () => {
    const signal = Signal.make({ type: 'time', mode: 'absolute' }, fixedClock(1_700_000_000_000));
    expect(signal.read()).toBe(1_700_000_000_000);
    void signal.lifetime.dispose();
  });

  test('the default clock still reads the ambient wall clock for absolute mode', () => {
    const before = Date.now();
    const signal = Signal.make({ type: 'time', mode: 'absolute' });
    const v = signal.read();
    const after = Date.now();
    expect(v).toBeGreaterThanOrEqual(before);
    expect(v).toBeLessThanOrEqual(after);
    void signal.lifetime.dispose();
  });
});
