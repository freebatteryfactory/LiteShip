/**
 * Component test: RenderWorker off-thread renderer.
 *
 * Covers worker bootstrap, canvas transfer, message forwarding,
 * subscriptions, and cleanup behavior.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Boundary, Diagnostics } from '@czap/core';
import { RenderWorker } from '@czap/worker';
import { MockWorker } from '../helpers/mock-worker.js';

// ---------------------------------------------------------------------------
// Extracted evaluateThresholds -- mirrors the inline worker script exactly.
// Kept in sync so regression tests catch semantic drift vs Boundary.evaluate.
// ---------------------------------------------------------------------------
function evaluateThresholds(thresholds: number[], states: string[], value: number): string {
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (value >= thresholds[i]!) {
      return states[i] || states[0] || '';
    }
  }
  return states[0] || '';
}

let restoreWorker: () => void;
let diagnosticEvents: Diagnostics.Event[] = [];

beforeEach(() => {
  restoreWorker = MockWorker.install();
  const { sink, events } = Diagnostics.createBufferSink();
  Diagnostics.setSink(sink);
  diagnosticEvents = events;

  if (typeof globalThis.Blob === 'undefined') {
    (globalThis as { Blob?: unknown }).Blob = class MockBlob {
      constructor(
        public parts: unknown[],
        public options?: unknown,
      ) {}
    };
  }

  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

afterEach(() => {
  Diagnostics.reset();
  restoreWorker();
  vi.restoreAllMocks();
});

describe('RenderWorker', () => {
  test('creates a worker and sends the init message', () => {
    const renderWorker = RenderWorker.create();
    const worker = MockWorker.instances[0]!;

    expect(renderWorker.worker).toBe(worker as never);
    expect(worker.postedMessages[0]?.data).toEqual({ type: 'init' });
  });

  test('sends construction-time WorkerConfig in the init message', () => {
    RenderWorker.create({ targetFps: 24, poolCapacity: 8 });
    const worker = MockWorker.instances[0]!;

    expect(worker.postedMessages[0]?.data).toEqual({
      type: 'init',
      config: { targetFps: 24, poolCapacity: 8 },
    });
  });

  test('transfers canvases through postMessage transfer lists', () => {
    const renderWorker = RenderWorker.create();
    const worker = MockWorker.instances[0]!;
    const canvas = { width: 640, height: 480 } as OffscreenCanvas;

    renderWorker.transferCanvas(canvas);

    expect(worker.postedMessages.at(-1)).toEqual({
      data: { type: 'transfer-canvas', canvas },
      transfer: [canvas],
    });
  });

  test('forwards render lifecycle messages', () => {
    const renderWorker = RenderWorker.create();
    const worker = MockWorker.instances[0]!;

    renderWorker.startRender({
      fps: 30,
      durationMs: 1000 as never,
      width: 640,
      height: 480,
    });
    renderWorker.stopRender();

    expect(worker.postedMessages.some((entry) => (entry.data as { type: string }).type === 'start-render')).toBe(true);
    expect(worker.postedMessages.some((entry) => (entry.data as { type: string }).type === 'stop-render')).toBe(true);
  });

  test('notifies frame and completion listeners and supports unsubscribe', () => {
    const renderWorker = RenderWorker.create();
    const worker = MockWorker.instances[0]!;
    const frames: number[] = [];
    const completions: number[] = [];

    const stopFrame = renderWorker.onFrame((frame) => {
      frames.push(frame.frame);
    });
    const stopComplete = renderWorker.onComplete((count) => {
      completions.push(count);
    });

    worker.simulateMessage({
      type: 'frame',
      output: {
        frame: 2,
        timestamp: 66.6,
        progress: 0.5,
        state: { discrete: {}, blend: {}, outputs: { css: {}, glsl: {}, aria: {} } },
      },
    });
    worker.simulateMessage({ type: 'render-complete', totalFrames: 10 });

    stopFrame();
    stopComplete();

    worker.simulateMessage({
      type: 'frame',
      output: {
        frame: 3,
        timestamp: 100,
        progress: 0.75,
        state: { discrete: {}, blend: {}, outputs: { css: {}, glsl: {}, aria: {} } },
      },
    });
    worker.simulateMessage({ type: 'render-complete', totalFrames: 11 });

    expect(frames).toEqual([2]);
    expect(completions).toEqual([10]);
  });

  test('routes worker and message errors through diagnostics and disposes cleanly', () => {
    const renderWorker = RenderWorker.create();
    const worker = MockWorker.instances[0]!;

    worker.simulateMessage({ type: 'error', message: 'render failed' });
    worker.simulateError('boom');

    renderWorker.dispose();

    expect(diagnosticEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'error',
          source: 'czap/worker.render-worker',
          code: 'worker-message-error',
          message: 'Render worker reported an error.',
          detail: 'render failed',
        }),
        expect.objectContaining({
          level: 'error',
          source: 'czap/worker.render-worker',
          code: 'worker-unhandled-error',
          message: 'Render worker raised an unhandled error.',
          detail: 'boom',
        }),
      ]),
    );
    expect(worker.postedMessages.some((entry) => (entry.data as { type: string }).type === 'dispose')).toBe(true);
    expect(worker.terminated).toBe(true);
  });

  test('ignores malformed worker messages that do not carry a string type', () => {
    const renderWorker = RenderWorker.create();
    const worker = MockWorker.instances[0]!;
    const frameSpy = vi.fn();
    const doneSpy = vi.fn();

    renderWorker.onFrame(frameSpy);
    renderWorker.onComplete(doneSpy);

    worker.simulateMessage(null);
    worker.simulateMessage({ type: 42 });

    expect(frameSpy).not.toHaveBeenCalled();
    expect(doneSpy).not.toHaveBeenCalled();
    expect(diagnosticEvents).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Regression: evaluateThresholds must agree with Boundary.evaluate
// ---------------------------------------------------------------------------

describe('evaluateThresholds (render-worker inline logic)', () => {
  test('value 800 with thresholds [0, 768, 1024] returns states[1] ("tablet"), not states[2]', () => {
    const thresholds = [0, 768, 1024];
    const states = ['mobile', 'tablet', 'desktop'];

    const result = evaluateThresholds(thresholds, states, 800);
    expect(result).toBe('tablet');
  });

  test('agrees with Boundary.evaluate across a range of values', () => {
    const bp = Boundary.make({
      input: 'viewport.width',
      at: [
        [0, 'mobile'] as const,
        [768, 'tablet'] as const,
        [1024, 'desktop'] as const,
      ],
    });

    const thresholds = [0, 768, 1024];
    const states = ['mobile', 'tablet', 'desktop'];

    for (const value of [0, 1, 400, 767, 768, 769, 800, 1023, 1024, 1025, 2000]) {
      const canonical = Boundary.evaluate(bp, value);
      const renderWorker = evaluateThresholds(thresholds, states, value);
      expect(renderWorker, `value=${value}`).toBe(canonical);
    }
  });

  test('returns first state when value is below all thresholds', () => {
    const result = evaluateThresholds([100, 200], ['a', 'b'], 50);
    expect(result).toBe('a');
  });

  test('returns last state when value exceeds all thresholds', () => {
    const result = evaluateThresholds([0, 100], ['a', 'b'], 999);
    expect(result).toBe('b');
  });
});

// ---------------------------------------------------------------------------
// Inline worker script behavior: wall-clock frame pacing (targetFps).
//
// The real RENDER_WORKER_SCRIPT is recovered from the Blob handed to
// URL.createObjectURL and executed against a fake worker `self`, so these
// tests exercise the actual render loop. Vitest fake timers stand in for
// the wall clock (setTimeout + Date), so no assertion depends on real
// elapsed time.
// ---------------------------------------------------------------------------

/** Minimal worker-global double the inline script drives. */
class FakeWorkerSelf {
  readonly posted: Array<{ type: string } & Record<string, unknown>> = [];
  closed = false;
  private readonly handlers: Array<(event: { data: unknown }) => void> = [];

  postMessage = (data: unknown): void => {
    this.posted.push(data as { type: string } & Record<string, unknown>);
  };

  addEventListener = (type: string, handler: (event: { data: unknown }) => void): void => {
    if (type === 'message') this.handlers.push(handler);
  };

  close = (): void => {
    this.closed = true;
  };

  /** Deliver a main-thread message to the script's handler. */
  dispatch(data: unknown): void {
    for (const handler of [...this.handlers]) handler({ data });
  }

  frames(): number[] {
    return this.posted.filter((m) => m.type === 'frame').map((m) => (m.output as { frame: number }).frame);
  }

  timestamps(): number[] {
    return this.posted.filter((m) => m.type === 'frame').map((m) => (m.output as { timestamp: number }).timestamp);
  }

  completions(): number[] {
    return this.posted.filter((m) => m.type === 'render-complete').map((m) => m.totalFrames as number);
  }
}

/** Boot the real inline render-worker script against a fake `self`. */
function bootRenderWorkerScript(script: string): FakeWorkerSelf {
  const workerSelf = new FakeWorkerSelf();
  // Classic worker scripts resolve setTimeout/Date from the global scope,
  // which is exactly where vitest fake timers install themselves.
  new Function('self', script)(workerSelf);
  return workerSelf;
}

describe('render worker script frame pacing (targetFps)', () => {
  let script: string;

  beforeEach(async () => {
    // RenderWorker.create hands the inline script to new Blob(...) and the
    // Blob to URL.createObjectURL (spied in the outer beforeEach).
    RenderWorker.create();
    const blob = vi.mocked(URL.createObjectURL).mock.calls.at(-1)?.[0] as Blob;
    script = await blob.text();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('paces frame emission against the wall clock without touching content timing', async () => {
    const workerSelf = bootRenderWorkerScript(script);
    // 50fps pacing budget = 20ms per frame.
    workerSelf.dispatch({ type: 'init', config: { targetFps: 50 } });
    // Content timing: 10fps over 500ms = 5 frames, 100ms timestamps.
    workerSelf.dispatch({ type: 'start-render', config: { fps: 10, durationMs: 500, width: 16, height: 16 } });

    // Frame 0 renders immediately; the loop is now inside its pacing wait.
    expect(workerSelf.frames()).toEqual([0]);

    // One tick before the 20ms budget opens: still no second frame.
    await vi.advanceTimersByTimeAsync(19);
    expect(workerSelf.frames()).toEqual([0]);

    // Budget boundary reached: exactly one more frame.
    await vi.advanceTimersByTimeAsync(1);
    expect(workerSelf.frames()).toEqual([0, 1]);

    // Let the wall clock run out: all frames emit, then render-complete.
    await vi.advanceTimersByTimeAsync(100);
    expect(workerSelf.frames()).toEqual([0, 1, 2, 3, 4]);
    expect(workerSelf.completions()).toEqual([5]);

    // Pacing is a wall-clock production throttle only: per-frame content
    // timestamps still follow VideoConfig.fps (10fps = 100ms steps).
    expect(workerSelf.timestamps()).toEqual([0, 100, 200, 300, 400]);
  });

  test('omitted targetFps preserves the unpaced burst default (yield every 10 frames)', async () => {
    const workerSelf = bootRenderWorkerScript(script);
    workerSelf.dispatch({ type: 'init' });
    // 12 frames: 0-9 burst synchronously, then a zero-timeout yield.
    workerSelf.dispatch({ type: 'start-render', config: { fps: 10, durationMs: 1200, width: 16, height: 16 } });

    expect(workerSelf.frames()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(workerSelf.completions()).toEqual([]);

    // The only wait is the stop-message yield -- zero wall-clock time.
    await vi.advanceTimersByTimeAsync(0);
    expect(workerSelf.frames()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(workerSelf.completions()).toEqual([12]);
  });

  test('non-positive targetFps falls back to the unpaced default', () => {
    const workerSelf = bootRenderWorkerScript(script);
    workerSelf.dispatch({ type: 'init', config: { targetFps: 0 } });
    workerSelf.dispatch({ type: 'start-render', config: { fps: 10, durationMs: 500, width: 16, height: 16 } });

    // All 5 frames burst synchronously -- no pacing timers were scheduled.
    expect(workerSelf.frames()).toEqual([0, 1, 2, 3, 4]);
    expect(workerSelf.completions()).toEqual([5]);
  });

  test('stop-render interrupts a paced render during the pacing wait', async () => {
    const workerSelf = bootRenderWorkerScript(script);
    workerSelf.dispatch({ type: 'init', config: { targetFps: 50 } });
    // 100 frames requested; only frame 0 should ever render.
    workerSelf.dispatch({ type: 'start-render', config: { fps: 10, durationMs: 10000, width: 16, height: 16 } });
    expect(workerSelf.frames()).toEqual([0]);

    // The loop is parked in its pacing wait; the stop message is processed
    // there and honored at the next iteration's stopRequested check.
    workerSelf.dispatch({ type: 'stop-render' });
    await vi.advanceTimersByTimeAsync(10000);

    expect(workerSelf.frames()).toEqual([0]);
    expect(workerSelf.completions()).toEqual([100]);
  });
});
