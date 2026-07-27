/**
 * Signal.audio and Scheduler.audioSync tests.
 *
 * Wave 6: Signal.audio is a plain factory (Effect-free) — `poll()` and `read()`
 * are synchronous. The Scheduler tests are transport-agnostic.
 */

import { describe, test, expect, vi } from 'vitest';
import { AVBridge, Signal, Scheduler } from '@liteship/core';

// ---------------------------------------------------------------------------
// Signal.audio -- sample mode
// ---------------------------------------------------------------------------

describe('Signal.audio (sample mode)', () => {
  test('starts at 0', () => {
    const bridge = AVBridge.make({ sampleRate: 48000, fps: 30 });
    const sig = Signal.audio(bridge, 'sample');
    expect(sig.read()).toBe(0);
  });

  test('poll() reads current sample from bridge', () => {
    const bridge = AVBridge.make({ sampleRate: 48000, fps: 30 });
    bridge.advanceSamples(5000);

    const sig = Signal.audio(bridge, 'sample');
    sig.poll();
    expect(sig.read()).toBe(5000);
  });

  test('poll() updates as bridge advances', () => {
    const bridge = AVBridge.make({ sampleRate: 48000, fps: 30 });
    const sig = Signal.audio(bridge, 'sample');
    const results: number[] = [];

    bridge.advanceSamples(1000);
    sig.poll();
    results.push(sig.read());

    bridge.advanceSamples(2000);
    sig.poll();
    results.push(sig.read());

    expect(results).toEqual([1000, 3000]);
  });

  test('source type is audio', () => {
    const bridge = AVBridge.make({ sampleRate: 48000, fps: 30 });
    const sig = Signal.audio(bridge, 'sample');
    expect(sig.source.type).toBe('audio');
  });

  test('sample mode returns the RAW sample even when a positive totalDurationSec is supplied', () => {
    // poll()'s normalize guard is `mode === 'normalized' && totalDurationSec !== undefined
    // && totalDurationSec > 0` — the mode conjunct MUST gate the duration conjuncts. A
    // duration passed incidentally in SAMPLE mode is inert: poll returns the raw sample
    // index, never a normalized 0..1 value. (Kills the audio-poll `&&`→`||` mutants.)
    const bridge = AVBridge.make({ sampleRate: 48000, fps: 30 });
    bridge.advanceSamples(5000);
    const sig = Signal.audio(bridge, 'sample', 10);
    expect(sig.poll()).toBe(5000);
    expect(sig.read()).toBe(5000);
  });
});

// ---------------------------------------------------------------------------
// Signal.audio -- normalized mode
// ---------------------------------------------------------------------------

describe('Signal.audio (normalized mode)', () => {
  test('returns 0 at sample 0', () => {
    const bridge = AVBridge.make({ sampleRate: 48000, fps: 30 });
    const sig = Signal.audio(bridge, 'normalized', 10);
    sig.poll();
    expect(sig.read()).toBe(0);
  });

  test('returns 0.5 at halfway point', () => {
    const bridge = AVBridge.make({ sampleRate: 48000, fps: 30 });
    bridge.advanceSamples(240000); // 10s * 48000 / 2

    const sig = Signal.audio(bridge, 'normalized', 10);
    sig.poll();
    expect(sig.read()).toBeCloseTo(0.5, 5);
  });

  test('clamps to 1 when past duration', () => {
    const bridge = AVBridge.make({ sampleRate: 48000, fps: 30 });
    bridge.advanceSamples(960000);

    const sig = Signal.audio(bridge, 'normalized', 10);
    sig.poll();
    expect(sig.read()).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Scheduler.audioSync
// ---------------------------------------------------------------------------

describe('Scheduler.audioSync', () => {
  test('has correct _tag', () => {
    const bridge = AVBridge.make({ sampleRate: 48000, fps: 30 });
    const sched = Scheduler.audioSync(bridge);
    expect(sched._tag).toBe('FrameScheduler');
  });

  test('frame starts at 0', () => {
    const bridge = AVBridge.make({ sampleRate: 48000, fps: 30 });
    const sched = Scheduler.audioSync(bridge);
    expect(sched.frame).toBe(0);
  });

  test('exposes the bridge', () => {
    const bridge = AVBridge.make({ sampleRate: 48000, fps: 30 });
    const sched = Scheduler.audioSync(bridge);
    expect(sched.bridge).toBe(bridge);
  });

  test('poll fires callback when frame crosses boundary', () => {
    const bridge = AVBridge.make({ sampleRate: 48000, fps: 30 });
    const sched = Scheduler.audioSync(bridge);

    const calls: number[] = [];
    const cb = (now: number) => {
      calls.push(now);
      sched.schedule(cb);
    };
    sched.schedule(cb);

    bridge.advanceSamples(1600);
    sched.poll();

    expect(calls.length).toBe(1);
    expect(calls[0]).toBeCloseTo((1600 / 48000) * 1000, 1);
  });

  test('poll does not fire if frame has not changed', () => {
    const bridge = AVBridge.make({ sampleRate: 48000, fps: 30 });
    const sched = Scheduler.audioSync(bridge);

    let callCount = 0;
    sched.schedule(() => {
      callCount++;
      sched.schedule(() => {
        callCount++;
      });
    });

    bridge.advanceSamples(800);
    sched.poll();
    sched.poll();

    // First poll sees frame 0 vs lastFrame -1, so it fires once
    expect(callCount).toBe(1);
  });

  test('fires once per frame boundary', () => {
    const bridge = AVBridge.make({ sampleRate: 48000, fps: 30 });
    const sched = Scheduler.audioSync(bridge);

    const frames: number[] = [];
    const cb = (now: number) => {
      frames.push(sched.frame);
      sched.schedule(cb);
    };
    sched.schedule(cb);

    for (let i = 0; i < 3; i++) {
      bridge.advanceSamples(1600);
      sched.poll();
    }

    expect(frames.length).toBe(3);
    expect(frames[0]).toBe(1);
    expect(frames[1]).toBe(2);
    expect(frames[2]).toBe(3);
  });

  test('cancel prevents callback from firing', () => {
    const bridge = AVBridge.make({ sampleRate: 48000, fps: 30 });
    const sched = Scheduler.audioSync(bridge);

    let called = false;
    sched.schedule(() => {
      called = true;
    });
    sched.cancel(0);

    bridge.advanceSamples(1600);
    sched.poll();

    expect(called).toBe(false);
  });

  test('frame getter reflects bridge state', () => {
    const bridge = AVBridge.make({ sampleRate: 48000, fps: 30 });
    const sched = Scheduler.audioSync(bridge);

    expect(sched.frame).toBe(0);
    bridge.advanceSamples(3200);
    expect(sched.frame).toBe(2);
  });
});

describe('Scheduler.raf', () => {
  test('cancel forwards to cancelAnimationFrame', () => {
    const cancelSpy = vi.fn();
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 7));
    vi.stubGlobal('cancelAnimationFrame', cancelSpy);

    const sched = Scheduler.raf();
    sched.cancel(42);

    expect(cancelSpy).toHaveBeenCalledWith(42);
    vi.unstubAllGlobals();
  });
});
