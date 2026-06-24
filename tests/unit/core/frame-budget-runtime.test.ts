import { afterEach, describe, expect, test, vi } from 'vitest';
import { Effect } from 'effect';
import { FrameBudget, manualClock } from '@czap/core';
import { runScopedAsync as runScoped } from '../../helpers/effect-test.js';

describe('FrameBudget runtime behavior', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('scheduleSync respects exhausted frame budgets while critical work still runs', async () => {
    vi.stubGlobal('requestAnimationFrame', undefined as never);
    vi.stubGlobal('cancelAnimationFrame', undefined as never);
    vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValue(100);

    const budget = await runScoped(FrameBudget.make({ targetFps: 60 }));

    expect(budget.scheduleSync('idle', () => 'skipped')).toBeNull();
    expect(budget.scheduleSync('critical', () => 'ran')).toBe('ran');
  });

  test('remaining() decays against an INJECTED clock (replayable, no ambient performance.now)', async () => {
    // No rAF, no performance — but an injected manualClock IS a real time source, so
    // remaining() decays deterministically against the advances the test makes.
    vi.stubGlobal('requestAnimationFrame', undefined as never);
    vi.stubGlobal('cancelAnimationFrame', undefined as never);
    vi.stubGlobal('performance', undefined as never);

    const clock = manualClock(1_000);
    // 60fps → a 16.666ms frame budget. Construction reads now() at t=1000 (frameStart).
    const budget = await runScoped(FrameBudget.make({ targetFps: 60, clock }));

    // No time elapsed yet → full budget.
    expect(budget.remaining()).toBeCloseTo(1000 / 60, 3);

    // Advance 10ms → ~6.67ms remaining in the frame; high lane (2ms) still runs,
    // idle lane (12ms) does not.
    clock.advance(10);
    expect(budget.remaining()).toBeCloseTo(1000 / 60 - 10, 3);
    expect(budget.canRun('high')).toBe(true);
    expect(budget.canRun('idle')).toBe(false);

    // Advance past the frame → clamped at 0, only critical runs.
    clock.advance(100);
    expect(budget.remaining()).toBe(0);
    expect(budget.scheduleSync('idle', () => 'skipped')).toBeNull();
    expect(budget.scheduleSync('critical', () => 'ran')).toBe('ran');
  });

  test('fpsSync starts at the configured target fps before any raf samples arrive', async () => {
    vi.stubGlobal('requestAnimationFrame', undefined as never);
    vi.stubGlobal('cancelAnimationFrame', undefined as never);

    const budget = await runScoped(FrameBudget.make({ targetFps: 30 }));

    expect(budget.fpsSync).toBe(30);
  });

  test('tracks raf-driven fps updates and cleans up the latest scheduled frame', async () => {
    const callbacks = new Map<number, FrameRequestCallback>();
    let nextId = 1;
    let nowValue = 0;

    vi.spyOn(performance, 'now').mockImplementation(() => nowValue);
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

    const result = await runScoped(
      Effect.gen(function* () {
        const budget = yield* FrameBudget.make({ targetFps: 60 });

        yield* Effect.sync(() => {
          callbacks.get(1)?.(0);
          callbacks.get(2)?.(500);
          callbacks.get(3)?.(1_000);
          nowValue = 1_001;
        });

        return {
          remaining: budget.remaining(),
          canRunHigh: budget.canRun('high'),
          fps: yield* budget.fps,
          fpsSync: budget.fpsSync,
          scheduled: yield* budget.schedule('high', Effect.succeed('rendered')),
        };
      }),
    );

    expect(result.remaining).toBeGreaterThan(15);
    expect(result.canRunHigh).toBe(true);
    expect(result.fps).toBe(3);
    expect(result.fpsSync).toBe(3);
    expect(result.scheduled).toBe('rendered');
    expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(4);
  });

  test('returns the full frame budget when performance is unavailable', async () => {
    vi.stubGlobal('requestAnimationFrame', undefined as never);
    vi.stubGlobal('cancelAnimationFrame', undefined as never);
    vi.stubGlobal('performance', undefined as never);

    const budget = await runScoped(FrameBudget.make({ targetFps: 50 }));

    expect(budget.remaining()).toBeCloseTo(20);
    expect(budget.canRun('idle')).toBe(true);
  });

  test('schedule defers non-critical work when the frame budget is exhausted', async () => {
    vi.stubGlobal('requestAnimationFrame', undefined as never);
    vi.stubGlobal('cancelAnimationFrame', undefined as never);
    vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValue(100);

    const result = await runScoped(
      Effect.gen(function* () {
        const budget = yield* FrameBudget.make({ targetFps: 60 });

        return {
          low: yield* budget.schedule('low', Effect.succeed('skipped')),
          critical: yield* budget.schedule('critical', Effect.succeed('ran')),
        };
      }),
    );

    expect(result).toEqual({ low: null, critical: 'ran' });
  });

  test('schedule still runs critical work when the budget is exhausted before the critical short-circuit', async () => {
    vi.stubGlobal('requestAnimationFrame', undefined as never);
    vi.stubGlobal('cancelAnimationFrame', undefined as never);
    vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValue(100);

    const result = await runScoped(
      Effect.gen(function* () {
        const budget = yield* FrameBudget.make({ targetFps: 60 });
        return yield* budget.schedule('critical', Effect.succeed('ran-critical'));
      }),
    );

    expect(result).toBe('ran-critical');
  });
});
