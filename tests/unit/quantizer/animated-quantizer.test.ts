import { describe, expect, test, vi } from 'vitest';
import { Boundary, Millis, CellKernel, StateName } from '@czap/core';
import type { BoundaryCrossing, ReactiveQuantizer } from '@czap/core';
import { AnimatedQuantizer, Q } from '@czap/quantizer';
import type { AnimatedQuantizerShape, InterpolatedFrame } from '@czap/quantizer';

function makeBoundary() {
  return Boundary.make({
    input: 'viewport.width',
    at: [
      [0, 'compact'],
      [768, 'expanded'],
    ] as const,
  });
}

type QState = 'compact' | 'expanded';
type Crossing = BoundaryCrossing<QState>;

/** Build a boundary crossing with a test-fixed HLC stamp. */
function crossing(from: QState, to: QState, value: number, wall = 0, counter = 0): Crossing {
  return {
    from: StateName(from),
    to: StateName(to),
    timestamp: { wall_ms: wall, counter, node_id: 'test' } as Crossing['timestamp'],
    value,
  };
}

/**
 * A controllable reactive mock: a replay-1 state slot parked on `initial` plus a
 * crossing fan-out the test drives via `emit`. Crossings are published on demand
 * (the fan-out is no-replay), so a test attaches its interpolated collector FIRST
 * and then emits — the animated quantizer subscribes to `changes` eagerly at
 * make(), so emitting drives the animation into the collector.
 */
function mockQuantizer(
  boundary: ReturnType<typeof makeBoundary>,
  initial: QState,
  evaluate: (value: number) => QState,
  opts?: { readonly stateSync?: () => QState },
): { quantizer: ReactiveQuantizer<typeof boundary>; emit: (c: Crossing) => void } {
  const changes = CellKernel.fanout<Crossing>();
  const base = {
    _tag: 'Quantizer' as const,
    boundary,
    state: CellKernel.replay1<QState>(initial),
    changes,
    evaluate,
  };
  const quantizer: ReactiveQuantizer<typeof boundary> = opts?.stateSync
    ? { ...base, stateSync: opts.stateSync }
    : base;
  return { quantizer, emit: (c: Crossing) => changes.publish(c) };
}

type Frame = InterpolatedFrame<ReturnType<typeof makeBoundary>>;

/** Collect the first `n` interpolated frames; `settled` resolves once `n` land. */
function collectN(
  animated: AnimatedQuantizerShape<ReturnType<typeof makeBoundary>>,
  n: number,
): { frames: Frame[]; settled: Promise<Frame[]>; dispose: () => void } {
  const frames: Frame[] = [];
  let resolve!: (v: Frame[]) => void;
  const settled = new Promise<Frame[]>((r) => {
    resolve = r;
  });
  const dispose = animated.interpolated.subscribe((f) => {
    frames.push(f);
    if (frames.length === n) resolve(frames.slice());
  });
  return { frames, settled, dispose };
}

/** Collect interpolated frames until one lands (`progress >= 1`). */
function collectUntilLanded(animated: AnimatedQuantizerShape<ReturnType<typeof makeBoundary>>): {
  frames: Frame[];
  settled: Promise<Frame[]>;
  dispose: () => void;
} {
  const frames: Frame[] = [];
  let resolve!: (v: Frame[]) => void;
  const settled = new Promise<Frame[]>((r) => {
    resolve = r;
  });
  const dispose = animated.interpolated.subscribe((f) => {
    frames.push(f);
    if (f.progress >= 1) resolve(frames.slice());
  });
  return { frames, settled, dispose };
}

describe('AnimatedQuantizer.make', () => {
  test('emits a completed frame immediately for zero-duration transitions', async () => {
    const boundary = makeBoundary();
    const { quantizer, emit } = mockQuantizer(boundary, 'compact', () => 'expanded');

    const { animated, lifetime } = AnimatedQuantizer.make(
      quantizer,
      { 'compact->expanded': { duration: Millis(0), delay: Millis(1) } },
      {
        compact: { opacity: 0, label: 'compact' },
        expanded: { opacity: 1, label: 'expanded' },
      },
    );
    const { settled, dispose } = collectN(animated, 1);
    emit(crossing('compact', 'expanded', 800));
    const frames = await settled;
    dispose();
    await lifetime.dispose();

    expect(frames).toHaveLength(1);
    expect(frames[0]).toEqual({
      state: 'expanded',
      progress: 1,
      outputs: { opacity: 1, label: 'expanded' },
    });
  });

  test('wraps the base quantizer state and delegates evaluate()', async () => {
    const boundary = makeBoundary();
    let evaluated = 0;
    const { quantizer } = mockQuantizer(boundary, 'compact', (value: number) => {
      evaluated = value;
      return 'expanded';
    });

    const { animated, lifetime } = AnimatedQuantizer.make(
      quantizer,
      { 'compact->expanded': { duration: Millis(20) } },
      {
        compact: { opacity: 0, label: 'compact' },
        expanded: { opacity: 1, label: 'expanded' },
      },
    );

    expect(animated._tag).toBe('Quantizer');
    expect(animated.state.read()).toBe('compact');
    expect(animated.transition.getTransition('compact', 'expanded').duration).toBe(20);
    expect(animated.evaluate(800)).toBe('expanded');
    expect(evaluated).toBe(800);

    await lifetime.dispose();
  });

  test('forwards stateSync when the wrapped quantizer exposes one', async () => {
    const boundary = makeBoundary();
    let syncCalls = 0;
    const { quantizer } = mockQuantizer(boundary, 'compact', () => 'compact', {
      stateSync: () => {
        syncCalls++;
        return 'compact';
      },
    });

    const { animated, lifetime } = AnimatedQuantizer.make(
      quantizer,
      { 'compact->expanded': { duration: Millis(0) } },
      { compact: { opacity: 0 }, expanded: { opacity: 1 } },
    );

    expect(typeof animated.stateSync).toBe('function');
    expect(animated.stateSync!()).toBe('compact');
    expect(syncCalls).toBe(1);

    await lifetime.dispose();
  });

  test('emits interpolated frames for positive-duration transitions and snaps string outputs at halfway', async () => {
    const boundary = makeBoundary();
    const { quantizer, emit } = mockQuantizer(boundary, 'compact', () => 'expanded');

    vi.useFakeTimers();
    try {
      const { animated, lifetime } = AnimatedQuantizer.make(
        quantizer,
        { '*': { duration: Millis(50) } },
        {
          compact: { opacity: 0, label: 'compact' },
          expanded: { opacity: 1, label: 'expanded' },
        },
      );
      const { settled, dispose } = collectN(animated, 3);
      emit(crossing('compact', 'expanded', 900));
      await vi.advanceTimersByTimeAsync(120);
      const frames = await settled;
      dispose();
      await lifetime.dispose();

      expect(frames.length).toBeGreaterThanOrEqual(2);
      expect(frames[0]!.progress).toBeGreaterThanOrEqual(0);
      expect(Number(frames[0]!.outputs.opacity)).toBeGreaterThanOrEqual(0);
      expect(Number(frames[0]!.outputs.opacity)).toBeLessThanOrEqual(1);
      expect(['compact', 'expanded']).toContain(frames[0]!.outputs.label);
      const last = frames.at(-1)!;
      expect(last.state).toBe('expanded');
      expect(last.progress).toBeGreaterThan(0.5);
      expect(Number(last.outputs.opacity)).toBeGreaterThan(0.5);
      expect(last.outputs.label).toBe('expanded');
    } finally {
      vi.useRealTimers();
    }
  });

  test('falls back to an instant transition when no exact or wildcard rule exists', async () => {
    const boundary = makeBoundary();
    const { quantizer } = mockQuantizer(boundary, 'compact', () => 'compact');

    const { animated, lifetime } = AnimatedQuantizer.make(quantizer, {});
    const transition = animated.transition.getTransition('compact', 'expanded');

    expect(transition.duration).toBe(0);
    expect(transition.delay).toBeUndefined();

    await lifetime.dispose();
  });

  test('honors delayed transitions and still settles on the latest output values', async () => {
    const boundary = makeBoundary();
    const { quantizer, emit } = mockQuantizer(boundary, 'compact', () => 'expanded');

    vi.useFakeTimers();
    try {
      const { animated, lifetime } = AnimatedQuantizer.make(
        quantizer,
        { '*': { duration: Millis(30), delay: Millis(20) } },
        {
          compact: { opacity: 0, label: 'compact' },
          expanded: { opacity: 1, label: 'expanded' },
        },
      );
      const { settled, dispose } = collectN(animated, 3);
      emit(crossing('compact', 'expanded', 900));
      await vi.advanceTimersByTimeAsync(100);
      const frames = await settled;
      dispose();
      await lifetime.dispose();

      expect(frames[0]!.state).toBe('expanded');
      expect(frames.at(-1)!.progress).toBeGreaterThan(0.5);
      expect(frames.at(-1)!.outputs.label).toBe('expanded');
      expect(Number(frames.at(-1)!.outputs.opacity)).toBeGreaterThan(0.5);
    } finally {
      vi.useRealTimers();
    }
  });

  test('interrupts an in-flight animation when a second crossing arrives', async () => {
    const boundary = makeBoundary();
    const { quantizer, emit } = mockQuantizer(boundary, 'compact', () => 'compact');

    vi.useFakeTimers();
    try {
      const { animated, lifetime } = AnimatedQuantizer.make(
        quantizer,
        { '*': { duration: Millis(200) } },
        {
          compact: { opacity: 0 },
          expanded: { opacity: 1 },
        },
      );
      const { settled, dispose } = collectN(animated, 4);
      // Two crossings back-to-back: the second interrupts the first (its
      // AbortController aborts the first animation's loop).
      emit(crossing('compact', 'expanded', 900, 0, 0));
      emit(crossing('expanded', 'compact', 100, 50, 1));
      await vi.advanceTimersByTimeAsync(500);
      const frames = await settled;
      dispose();
      await lifetime.dispose();

      // The second crossing should have interrupted the first: the last frame
      // targets 'compact' (the second crossing's destination).
      const last = frames.at(-1)!;
      expect(last.state).toBe('compact');
    } finally {
      vi.useRealTimers();
    }
  });

  test('lerps outputs with keys present in only one side', async () => {
    const boundary = makeBoundary();
    const { quantizer, emit } = mockQuantizer(boundary, 'compact', () => 'expanded');

    const { animated, lifetime } = AnimatedQuantizer.make(
      quantizer,
      { '*': { duration: Millis(0) } },
      {
        compact: { alpha: 0 },
        expanded: { beta: 1, label: 'end' },
      },
    );
    const { settled, dispose } = collectN(animated, 1);
    emit(crossing('compact', 'expanded', 900));
    const frames = await settled;
    dispose();
    await lifetime.dispose();

    expect(frames).toHaveLength(1);
    // Keys from only the target side should snap to their target values.
    expect(frames[0]!.outputs.beta).toBe(1);
    expect(frames[0]!.outputs.label).toBe('end');
  });

  test('works without explicit output maps (undefined outputs)', async () => {
    const boundary = makeBoundary();
    const { quantizer, emit } = mockQuantizer(boundary, 'compact', () => 'expanded');

    const { animated, lifetime } = AnimatedQuantizer.make(quantizer, { '*': { duration: Millis(0) } });
    const { settled, dispose } = collectN(animated, 1);
    emit(crossing('compact', 'expanded', 900));
    const frames = await settled;
    dispose();
    await lifetime.dispose();

    expect(frames).toHaveLength(1);
    expect(frames[0]!.state).toBe('expanded');
    expect(frames[0]!.outputs).toEqual({});
  });

  test('falls back to Date.now timing when performance is unavailable and preserves one-sided outputs', async () => {
    const boundary = makeBoundary();
    const { quantizer, emit } = mockQuantizer(boundary, 'compact', () => 'expanded');

    vi.useFakeTimers();
    vi.stubGlobal('performance', undefined);
    try {
      const { animated, lifetime } = AnimatedQuantizer.make(
        quantizer,
        { '*': { duration: Millis(20) } },
        {
          compact: { fromOnly: 'compact-label' },
          expanded: { toOnly: 'expanded-label' },
        },
      );
      const { settled, dispose } = collectN(animated, 2);
      emit(crossing('compact', 'expanded', 900));
      await vi.advanceTimersByTimeAsync(80);
      const frames = await settled;
      dispose();
      await lifetime.dispose();

      expect(frames).toHaveLength(2);
      expect(frames[0]!.outputs.fromOnly).toBe('compact-label');
      expect(frames[0]!.outputs.toOnly).toBe('expanded-label');
      expect(frames.at(-1)!.state).toBe('expanded');
      expect(frames.at(-1)!.outputs.fromOnly).toBe('compact-label');
      expect(frames.at(-1)!.outputs.toOnly).toBe('expanded-label');
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  test('completes cleanly with no frames when the source never crosses', async () => {
    const boundary = makeBoundary();
    const { quantizer } = mockQuantizer(boundary, 'compact', () => 'compact');

    const { animated, lifetime } = AnimatedQuantizer.make(quantizer, { '*': { duration: Millis(20) } });
    // No crossing is ever emitted — nothing animates. Subscribe then dispose;
    // disposal closes the fan-out and tears down cleanly (no throw).
    const dispose = animated.interpolated.subscribe(() => undefined);
    dispose();
    await lifetime.dispose();
  });

  test('derives interpolation outputs from a LiveQuantizer config.outputs.css when outputs are omitted', async () => {
    const boundary = makeBoundary();
    const config = Q.from(boundary).outputs({
      css: {
        compact: { opacity: '0', width: '10px' },
        expanded: { opacity: '1', width: '20px' },
      },
    });
    const { quantizer: live, lifetime: liveLifetime } = config.create();
    const { animated, lifetime } = AnimatedQuantizer.make(live, { '*': { duration: 0 } });
    const { settled, dispose } = collectN(animated, 1);
    live.evaluate(900); // compact -> expanded crossing
    const frames = await settled;
    dispose();
    await lifetime.dispose();
    await liveLifetime.dispose();

    expect(frames).toHaveLength(1);
    // '1' is finite-numeric and coerces so it lerps; '20px' passes through as a string.
    expect(frames[0]).toEqual({
      state: 'expanded',
      progress: 1,
      outputs: { opacity: 1, width: '20px' },
    });
  });

  test('explicit outputs still override derivation for a LiveQuantizer', async () => {
    const boundary = makeBoundary();
    const config = Q.from(boundary).outputs({
      css: {
        compact: { opacity: '0.25' },
        expanded: { opacity: '0.75' },
      },
    });
    const { quantizer: live, lifetime: liveLifetime } = config.create();
    const { animated, lifetime } = AnimatedQuantizer.make(
      live,
      { '*': { duration: 0 } },
      { compact: { scale: 1 }, expanded: { scale: 2 } },
    );
    const { settled, dispose } = collectN(animated, 1);
    live.evaluate(900);
    const frames = await settled;
    dispose();
    await lifetime.dispose();
    await liveLifetime.dispose();

    expect(frames).toHaveLength(1);
    expect(frames[0]!.outputs).toEqual({ scale: 2 });
  });

  test('snaps non-numeric outputs to the target value at eased halfway progress', async () => {
    const boundary = makeBoundary();
    const { quantizer, emit } = mockQuantizer(boundary, 'compact', () => 'expanded');

    vi.useFakeTimers();
    try {
      const { animated, lifetime } = AnimatedQuantizer.make(
        quantizer,
        { '*': { duration: Millis(20), easing: () => 0.5 } },
        {
          compact: { label: 'compact' },
          expanded: { label: 'expanded' },
        },
      );
      const { settled, dispose } = collectN(animated, 1);
      emit(crossing('compact', 'expanded', 900));
      await vi.advanceTimersByTimeAsync(40);
      const frames = await settled;
      dispose();
      await lifetime.dispose();

      expect(frames).toHaveLength(1);
      expect(frames[0]!.outputs.label).toBe('expanded');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('AnimatedQuantizer.make — injected scheduler', () => {
  // A deterministic frame clock: each scheduled tick fires on a microtask with a
  // monotonically increasing timestamp (16ms apart). No real timers — the whole
  // animation drains via microtasks under `await`, proving the cadence is driven
  // by the injected scheduler rather than the internal 16ms sleep.
  function microtaskClock() {
    let id = 0;
    let calls = 0;
    return {
      calls: () => calls,
      scheduler: {
        _tag: 'FrameScheduler' as const,
        schedule(cb: (now: number) => void): number {
          calls += 1;
          const myId = (id += 1);
          queueMicrotask(() => cb(myId * 16));
          return myId;
        },
        cancel(): void {},
      },
    };
  }

  function crossingQuantizer() {
    const boundary = makeBoundary();
    return mockQuantizer(boundary, 'compact', () => 'expanded');
  }

  test('drives the frame cadence from the injected scheduler, not the 16ms loop', async () => {
    const clock = microtaskClock();
    const { quantizer, emit } = crossingQuantizer();
    const { animated, lifetime } = AnimatedQuantizer.make(
      quantizer,
      { 'compact->expanded': { duration: Millis(64) } },
      { compact: { opacity: 0 }, expanded: { opacity: 1 } },
      { scheduler: clock.scheduler },
    );
    const { settled, dispose } = collectUntilLanded(animated);
    emit(crossing('compact', 'expanded', 800));
    const frames = await settled;
    dispose();
    await lifetime.dispose();

    // The scheduler was the cadence source.
    expect(clock.calls()).toBeGreaterThan(0);
    // It ran to completion with monotonic, non-decreasing progress.
    expect(frames.length).toBeGreaterThanOrEqual(2);
    expect(frames.at(-1)?.progress).toBe(1);
    expect(frames.at(-1)?.outputs.opacity).toBe(1);
    for (let i = 1; i < frames.length; i += 1) {
      expect(frames[i]!.progress).toBeGreaterThanOrEqual(frames[i - 1]!.progress);
    }
  });

  test('omitting the scheduler is unchanged — still completes via the default loop', async () => {
    vi.useFakeTimers();
    try {
      const { quantizer, emit } = crossingQuantizer();
      const { animated, lifetime } = AnimatedQuantizer.make(
        quantizer,
        { 'compact->expanded': { duration: Millis(32) } },
        { compact: { opacity: 0 }, expanded: { opacity: 1 } },
        // no options arg — default 16ms path
      );
      const { settled, dispose } = collectUntilLanded(animated);
      emit(crossing('compact', 'expanded', 800));
      await vi.advanceTimersByTimeAsync(80);
      const frames = await settled;
      dispose();
      await lifetime.dispose();

      expect(frames.at(-1)?.progress).toBe(1);
      expect(frames.at(-1)?.outputs.opacity).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  test('a transition delay is consumed on the injected clock, not wall-clock', async () => {
    // With a `delay`, the pre-roll must ride the SAME scheduler so a deterministic
    // render/test stays deterministic — a wall-clock sleep would hang here (no
    // real timers) or desync the frames. The microtask clock drives both the
    // delay and the transition, so the stream completes with the landed frame.
    const clock = microtaskClock();
    const { quantizer, emit } = crossingQuantizer();
    const { animated, lifetime } = AnimatedQuantizer.make(
      quantizer,
      { 'compact->expanded': { duration: Millis(48), delay: Millis(32) } },
      { compact: { opacity: 0 }, expanded: { opacity: 1 } },
      { scheduler: clock.scheduler },
    );
    const { settled, dispose } = collectUntilLanded(animated);
    emit(crossing('compact', 'expanded', 800));
    const frames = await settled;
    dispose();
    await lifetime.dispose();

    // The delay was driven by the scheduler too (extra scheduled ticks beyond the
    // transition's own), and the transition still lands cleanly.
    expect(clock.calls()).toBeGreaterThan(0);
    expect(frames.at(-1)?.progress).toBe(1);
    expect(frames.at(-1)?.outputs.opacity).toBe(1);
  });
});

describe('AnimatedQuantizer.make — dispose promptness (scar S3.2)', () => {
  // A recording frame clock that NEVER auto-fires: every schedule() stores the
  // pending frame callback and returns a fresh id; step() is the ONLY way a tick
  // fires. It records schedule/cancel calls so a test can assert what happened
  // WITHOUT advancing the clock. This is the QA probe: park the animation on a
  // pending tick, dispose, and prove `cancel` fires without a further step().
  function recordingScheduler() {
    let nextId = 0;
    let pending: { readonly id: number; readonly cb: (now: number) => void } | null = null;
    const scheduleIds: number[] = [];
    const cancelIds: number[] = [];
    return {
      scheduleCount: (): number => scheduleIds.length,
      cancelCount: (): number => cancelIds.length,
      hasPending: (): boolean => pending !== null,
      step: (now: number): void => {
        const p = pending;
        if (p !== null) {
          pending = null;
          p.cb(now);
        }
      },
      scheduler: {
        _tag: 'FrameScheduler' as const,
        schedule(cb: (now: number) => void): number {
          const id = (nextId += 1);
          scheduleIds.push(id);
          pending = { id, cb };
          return id;
        },
        cancel(id: number): void {
          cancelIds.push(id);
          if (pending?.id === id) pending = null;
        },
      },
    };
  }

  // Drain the entire microtask queue: a macrotask boundary runs only after every
  // queued microtask (and any they queue) has settled. The recording clock uses
  // no timers, so nothing competes — one hop deterministically flushes the whole
  // abort -> resume -> return() -> finally -> cancel chain.
  const flush = (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, 0));

  test('dispose mid-animation cancels the pending scheduler tick WITHOUT another step', async () => {
    const boundary = makeBoundary();
    const { quantizer, emit } = mockQuantizer(boundary, 'compact', () => 'expanded');
    const recorder = recordingScheduler();

    const { animated, lifetime } = AnimatedQuantizer.make(
      quantizer,
      // Long duration so a single tick never lands the animation — it stays
      // in-flight, parked on the next pending tick.
      { 'compact->expanded': { duration: Millis(1000) } },
      { compact: { opacity: 0 }, expanded: { opacity: 1 } },
      { scheduler: recorder.scheduler },
    );

    const collected: Frame[] = [];
    const unsubscribe = animated.interpolated.subscribe((f) => collected.push(f));

    // Start the animation, then fire exactly one frame so it is genuinely
    // mid-flight and parked on the SECOND pending tick.
    emit(crossing('compact', 'expanded', 900));
    await flush();
    recorder.step(0);
    await flush();

    // Precondition: in-flight, parked on a pending tick, nothing cancelled yet.
    expect(collected.length).toBeGreaterThanOrEqual(1);
    expect(recorder.hasPending()).toBe(true);
    expect(recorder.cancelCount()).toBe(0);
    const schedulesAtDispose = recorder.scheduleCount();

    // Dispose mid-animation. The clock is NEVER stepped again after this point.
    await lifetime.dispose();
    await flush();

    // LAW (S3.2): the pending tick's finalizer ran promptly — `cancel` fired
    // without another `step()`, and no new tick was scheduled.
    expect(recorder.cancelCount()).toBeGreaterThanOrEqual(1);
    expect(recorder.scheduleCount()).toBe(schedulesAtDispose);

    unsubscribe();
  });
});
