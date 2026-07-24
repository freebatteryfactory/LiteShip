import { afterEach, describe, expect, test, vi } from 'vitest';
import { manualClock, createFrameBudget } from '@liteship/core';

describe('FrameBudget runtime behavior', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('scheduleSync respects exhausted frame budgets while critical work still runs', () => {
    vi.stubGlobal('requestAnimationFrame', undefined as never);
    vi.stubGlobal('cancelAnimationFrame', undefined as never);
    vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValue(100);

    const budget = createFrameBudget({ targetFps: 60 });

    expect(budget.scheduleSync('idle', () => 'skipped')).toBeNull();
    expect(budget.scheduleSync('critical', () => 'ran')).toBe('ran');
  });

  test('remaining() decays against an INJECTED clock (replayable, no ambient performance.now)', () => {
    // No rAF, no performance — but an injected manualClock IS a real time source, so
    // remaining() decays deterministically against the advances the test makes.
    vi.stubGlobal('requestAnimationFrame', undefined as never);
    vi.stubGlobal('cancelAnimationFrame', undefined as never);
    vi.stubGlobal('performance', undefined as never);

    const clock = manualClock(1_000);
    // 60fps → a 16.666ms frame budget. Construction reads now() at t=1000 (frameStart).
    const budget = createFrameBudget({ targetFps: 60, clock });

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

  test('fpsSync starts at the configured target fps before any raf samples arrive', () => {
    vi.stubGlobal('requestAnimationFrame', undefined as never);
    vi.stubGlobal('cancelAnimationFrame', undefined as never);

    const budget = createFrameBudget({ targetFps: 30 });

    expect(budget.fpsSync).toBe(30);
  });

  test('tracks raf-driven fps updates and cleans up the latest scheduled frame on dispose', async () => {
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

    const budget = createFrameBudget({ targetFps: 60 });

    callbacks.get(1)?.(0);
    callbacks.get(2)?.(500);
    callbacks.get(3)?.(1_000);
    nowValue = 1_001;

    expect(budget.remaining()).toBeGreaterThan(15);
    expect(budget.canRun('high')).toBe(true);
    expect(budget.fpsSync).toBe(3);
    expect(budget.scheduleSync('high', () => 'rendered')).toBe('rendered');

    // Disposing the Lifetime cancels the latest scheduled frame (id 4 — make + 3 ticks).
    await budget.dispose();
    expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(4);
  });

  test('returns the full frame budget when performance is unavailable', () => {
    vi.stubGlobal('requestAnimationFrame', undefined as never);
    vi.stubGlobal('cancelAnimationFrame', undefined as never);
    vi.stubGlobal('performance', undefined as never);

    const budget = createFrameBudget({ targetFps: 50 });

    expect(budget.remaining()).toBeCloseTo(20);
    expect(budget.canRun('idle')).toBe(true);
  });

  test('scheduleSync defers non-critical work when the frame budget is exhausted', () => {
    vi.stubGlobal('requestAnimationFrame', undefined as never);
    vi.stubGlobal('cancelAnimationFrame', undefined as never);
    vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValue(100);

    const budget = createFrameBudget({ targetFps: 60 });

    expect({
      low: budget.scheduleSync('low', () => 'skipped'),
      critical: budget.scheduleSync('critical', () => 'ran'),
    }).toEqual({ low: null, critical: 'ran' });
  });

  test('scheduleSync still runs critical work when the budget is exhausted before the critical short-circuit', () => {
    vi.stubGlobal('requestAnimationFrame', undefined as never);
    vi.stubGlobal('cancelAnimationFrame', undefined as never);
    vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValue(100);

    const budget = createFrameBudget({ targetFps: 60 });
    expect(budget.scheduleSync('critical', () => 'ran-critical')).toBe('ran-critical');
  });
});
