// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Boundary, Millis, Scheduler, Timeline } from '@czap/core';

/**
 * Timeline<B> — Wave 6 plain CellKernel transport (Effect-free). RED-FIRST law
 * table for the swap onto {@link CellKernel.replay1}: plain `Timeline.from` +
 * injected `Scheduler`; `state`/`progress`/`elapsed` sync reads; play/pause/
 * seek/scrub/reverse sync; the state channel dedups (EmissionPolicy {distinct} —
 * the hand-rolled `newState !== oldState` guard is the product law); disposal via
 * `Lifetime`. Behavior matches the Wave 5.5 capture
 * (`tests/fixtures/reactive-capture/timeline.json`).
 */

const makeBoundary = () =>
  Boundary.make({
    input: 'time.elapsed',
    at: [
      [0, 'idle'],
      [100, 'active'],
      [200, 'done'],
    ] as const,
  });

describe('Timeline runtime behavior', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('loops forward and backward with a fixed-step scheduler', () => {
    const scheduler = Scheduler.fixedStep(10);
    const timeline = Timeline.from(makeBoundary(), {
      duration: Millis(200),
      loop: true,
      scheduler,
    });

    timeline.play();
    scheduler.step();
    scheduler.step();

    timeline.reverse();
    scheduler.step();
    scheduler.step();

    timeline.reverse();
    timeline.pause();

    expect({
      elapsed: timeline.elapsed(),
      progress: timeline.progress(),
      state: timeline.state(),
    }).toEqual({ elapsed: 100, progress: 0.5, state: 'active' });
  });

  test('stays put across scheduler ticks until play() is called (initial paused)', () => {
    // `playing` starts false — a freshly constructed timeline does NOT advance on
    // scheduler ticks before play(). fixedStep(10) feeds now = 0,100,200; without
    // play() every tick is a no-op, so elapsed/state stay at their initial values.
    const scheduler = Scheduler.fixedStep(10);
    const timeline = Timeline.from(makeBoundary(), { duration: Millis(200), scheduler });

    scheduler.step();
    scheduler.step();
    scheduler.step();

    expect(timeline.elapsed()).toBe(0);
    expect(timeline.state()).toBe('idle');
  });

  test('play advances elapsed by the inter-tick delta (now - lastTime), accumulated across frames', () => {
    // fixedStep(10) feeds now = 0,100,200. Tick 1 only seeds lastTime (=0, no
    // advance); ticks 2 and 3 each integrate a 100ms delta → elapsed 100 then 200.
    // The third tick (lastTime=100, now=200) is where `now - lastTime` (=100) and
    // `now + lastTime` (=300) diverge — pinning the subtraction. Duration is large
    // so no clamp masks the delta.
    const scheduler = Scheduler.fixedStep(10);
    const timeline = Timeline.from(makeBoundary(), { duration: Millis(10_000), scheduler });

    timeline.play();
    scheduler.step(); // now=0   → lastTime=0 (no advance)
    scheduler.step(); // now=100 → +100 → elapsed 100
    scheduler.step(); // now=200 → +100 → elapsed 200 (mutant `+`: +300 → 400)

    expect(timeline.elapsed()).toBe(200);
  });

  test('uses provided duration and browser raf scheduling when no custom scheduler is passed', async () => {
    const callbacks = new Map<number, FrameRequestCallback>();
    let nextId = 1;

    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        const id = nextId++;
        callbacks.set(id, callback);
        return id;
      }),
    );
    const cancelAnimationFrameSpy = vi.fn((id: number) => {
      callbacks.delete(id);
    });
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrameSpy);

    const timeline = Timeline.from(makeBoundary(), { duration: Millis(250) });

    callbacks.get(1)?.(0);
    timeline.play();
    callbacks.get(2)?.(125);

    expect({ progress: timeline.progress(), state: timeline.state() }).toEqual({ progress: 0.5, state: 'active' });

    // Disposal cancels the LATEST scheduled frame (the scope-bound sched.cancel of
    // the old impl, now a Lifetime finalizer).
    await timeline.lifetime.dispose();
    expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(3);
  });

  test('falls back to noop scheduling and a 1000ms duration for degenerate boundaries', () => {
    vi.stubGlobal('requestAnimationFrame', undefined);
    vi.stubGlobal('cancelAnimationFrame', undefined);

    // A degenerate boundary with NO thresholds exercises the `duration = 1000`
    // fallback + the noop scheduler. `Boundary.make` always yields a non-empty
    // threshold list, so override an existing (fully-branded) boundary's
    // thresholds to empty — evaluate then returns states[0] ('idle') for any value.
    const boundary: ReturnType<typeof makeBoundary> = { ...makeBoundary(), thresholds: [] };

    const timeline = Timeline.from(boundary);

    timeline.seek(Millis(1_500));
    timeline.scrub(2);

    expect({
      elapsed: timeline.elapsed(),
      progress: timeline.progress(),
      state: timeline.state(),
    }).toEqual({ elapsed: 1_000, progress: 1, state: 'idle' });
  });

  test('derives the default duration from the final threshold when none is provided', () => {
    const timeline = Timeline.from(makeBoundary());

    timeline.seek(Millis(400));

    expect({
      elapsed: timeline.elapsed(),
      progress: timeline.progress(),
      state: timeline.state(),
    }).toEqual({ elapsed: 240, progress: 1, state: 'done' });
  });

  test('clamps seek and scrub operations while only updating state when it changes', () => {
    const scheduler = Scheduler.fixedStep(60);
    const timeline = Timeline.from(makeBoundary(), {
      duration: Millis(200),
      scheduler,
    });

    timeline.seek(Millis(50));
    timeline.seek(Millis(150));
    timeline.scrub(-1);
    timeline.scrub(2);

    expect({
      elapsed: timeline.elapsed(),
      progress: timeline.progress(),
      state: timeline.state(),
    }).toEqual({ elapsed: 200, progress: 1, state: 'done' });
  });
});

// ---------------------------------------------------------------------------
// state channel — replay-1 subscribe + EmissionPolicy {distinct} (the product law)
// ---------------------------------------------------------------------------

describe('Timeline — state channel subscribe + {distinct} dedup', () => {
  test('subscribe replays the current state synchronously', () => {
    const timeline = Timeline.from(makeBoundary(), { duration: Millis(200) });
    const got: string[] = [];
    timeline.subscribe((s) => got.push(s));
    expect(got).toEqual(['idle']);
  });

  test('a seek into the SAME state is NOT re-published (distinct); a state change is', () => {
    const timeline = Timeline.from(makeBoundary(), { duration: Millis(200) });
    const got: string[] = [];
    timeline.subscribe((s) => got.push(s));
    timeline.seek(Millis(150)); // idle -> active (published)
    timeline.seek(Millis(160)); // active -> active (suppressed)
    timeline.seek(Millis(50)); // active -> idle (published)
    expect(got).toEqual(['idle', 'active', 'idle']);
    expect(timeline.state()).toBe('idle');
  });

  test('the FIRST publish of the initial state is suppressed (seeded {distinct})', () => {
    const timeline = Timeline.from(makeBoundary(), { duration: Millis(200) });
    const got: string[] = [];
    timeline.subscribe((s) => got.push(s));
    timeline.seek(Millis(30)); // still 'idle' — must NOT re-deliver (matches the old slot-compare guard)
    expect(got).toEqual(['idle']);
    expect(timeline.state()).toBe('idle');
  });
});

// ---------------------------------------------------------------------------
// disposal via Lifetime
// ---------------------------------------------------------------------------

describe('Timeline — disposal via Lifetime', () => {
  test('disposing cancels the scheduler so a later tick does not advance', () => {
    const scheduler = Scheduler.fixedStep(10);
    const timeline = Timeline.from(makeBoundary(), { duration: Millis(200), scheduler });

    timeline.play();
    scheduler.step(); // first tick primes lastTime (no advance)

    void timeline.lifetime.dispose();

    scheduler.step(); // cancelled — no callback, no advance
    scheduler.step();
    expect(timeline.state()).toBe('idle');
  });

  test('disposing completes state subscribers once and stops delivery', async () => {
    const timeline = Timeline.from(makeBoundary(), { duration: Millis(200), scheduler: Scheduler.fixedStep(10) });
    const got: string[] = [];
    let completed = 0;
    timeline.subscribe({ next: (s) => got.push(s), complete: () => (completed += 1) });
    await timeline.lifetime.dispose();
    expect(completed).toBe(1);
    timeline.seek(Millis(150)); // inert after close (kernel closed)
    expect(got).toEqual(['idle']);
  });

  test('a state subscriber disposing DURING a tick does NOT re-arm the scheduler', () => {
    // Disposal-resurrection race: a state subscriber calls dispose() from inside
    // setState(). The finalizer cancels the schedId of the tick already executing (a
    // no-op) — without the monotonic `disposed` guard, step() would install a FRESH
    // callback after disposal and tick forever. A recording scheduler makes the
    // outstanding-callback state observable.
    let scheduleCount = 0;
    let pending: ((now: number) => void) | null = null;
    let nextId = 1;
    const scheduler: Scheduler.Shape = {
      _tag: 'FrameScheduler',
      schedule: (cb) => {
        scheduleCount += 1;
        pending = cb;
        return nextId++;
      },
      cancel: () => {
        pending = null;
      },
    };
    const fire = (now: number): void => {
      const cb = pending;
      pending = null;
      cb?.(now);
    };

    const timeline = Timeline.from(makeBoundary(), { duration: Millis(200), scheduler });
    expect(scheduleCount).toBe(1); // construction armed the first callback

    // Dispose the instant the state actually CHANGES (idle -> active); {distinct}
    // suppresses same-state, so this fires exactly once, from inside setState.
    timeline.subscribe((s) => {
      if (s === 'active') void timeline.lifetime.dispose();
    });

    timeline.play();
    fire(0); // primes lastTime (no advance), re-arms → scheduleCount 2
    fire(150); // dt=150 → 'active' → subscriber disposes mid-setState → MUST NOT re-arm

    expect(timeline.lifetime.disposed).toBe(true);
    expect(pending).toBeNull(); // no callback left outstanding after disposal
    expect(scheduleCount).toBe(2); // the disposing tick did not schedule a third frame

    fire(300); // even if a stray frame existed, pending is null — provably dead
    expect(timeline.state()).toBe('active'); // frozen; no post-dispose advancement
  });
});
