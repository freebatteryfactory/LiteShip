import { describe, expect, test } from 'vitest';
import { offscreenCanvasAbsent } from '../helpers/capabilities.browser.js';
import { RenderWorker } from '../../packages/worker/src/render-worker.js';

function waitForWorkerReady(worker: RenderWorker, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for worker ready')), timeoutMs);
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'ready') {
        clearTimeout(timer);
        worker.worker.removeEventListener('message', handler);
        resolve();
      }
    };
    worker.worker.addEventListener('message', handler);
  });
}

describe('browser RenderWorker with real Worker and OffscreenCanvas', () => {

  test('create spawns a real Worker that emits ready on init', async () => {
    const worker = RenderWorker.create();
    await waitForWorkerReady(worker);
    worker.dispose();
  });

  test('dispose terminates the worker without errors', async () => {
    const worker = RenderWorker.create();
    await waitForWorkerReady(worker);
    expect(() => worker.dispose()).not.toThrow();
    expect(() => worker.dispose()).not.toThrow();
  });

  test('worker.worker exposes the real Worker instance', () => {
    const rw = RenderWorker.create();
    expect(rw.worker).toBeInstanceOf(Worker);
    rw.dispose();
  });

  describe.skipIf(offscreenCanvasAbsent)('OffscreenCanvas-dependent flows', () => {
  test('transferCanvas sends OffscreenCanvas to the worker', async () => {
    const worker = RenderWorker.create();

    await waitForWorkerReady(worker);

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const offscreen = canvas.transferControlToOffscreen();

    // Should not throw -- canvas is transferred to worker
    expect(() => worker.transferCanvas(offscreen)).not.toThrow();

    worker.dispose();
  });

  test('startRender produces frame events and render-complete', async () => {
    const worker = RenderWorker.create();

    await waitForWorkerReady(worker);

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const offscreen = canvas.transferControlToOffscreen();
    worker.transferCanvas(offscreen);

    const frames: unknown[] = [];
    let completedFrames = 0;

    const unsubFrame = worker.onFrame((output) => {
      frames.push(output);
    });

    const done = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out waiting for render-complete')), 5000);
      worker.onComplete((total) => {
        clearTimeout(timer);
        completedFrames = total;
        resolve();
      });
    });

    worker.startRender({
      fps: 10,
      width: 32,
      height: 32,
      durationMs: 200 as never,
    });

    await done;
    unsubFrame();

    expect(frames.length).toBeGreaterThan(0);
    expect(completedFrames).toBeGreaterThan(0);

    worker.dispose();
  });

  // Anchored on a frame event rather than wall clock: the worker yields
  // every 10 frames (render-worker.ts: `if (i % 10 === 9)`), and a stop
  // posted during one of those yield windows is processed before the
  // next iteration. Issuing stop after frame 3 deterministically lands
  // in the yield at frame 9, so we get ~10 frames out of a 300-frame
  // request regardless of how fast the realm is.
  test('stopRender halts an in-progress render early', async () => {
    const worker = RenderWorker.create();

    await waitForWorkerReady(worker);

    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const offscreen = canvas.transferControlToOffscreen();
    worker.transferCanvas(offscreen);

    const TOTAL_FRAMES_REQUESTED = 300; // 30 fps × 10_000 ms / 1000
    const STOP_AT_FRAME = 3;

    const seen: number[] = [];
    let stopIssued = false;

    // The worker is contract-bound to post `render-complete` after the loop
    // exits (whether by natural finish or by `stopRequested` break). If it
    // doesn't fire within the ceiling we fail loud rather than passing on
    // a silent stop-flow regression.
    const done = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Timed out waiting for render-complete after stopRender()')),
        5000,
      );
      worker.onComplete(() => {
        clearTimeout(timer);
        resolve();
      });
    });

    worker.onFrame((output) => {
      const frameNum = (output as { frame: number }).frame;
      seen.push(frameNum);
      if (!stopIssued && frameNum >= STOP_AT_FRAME) {
        stopIssued = true;
        worker.stopRender();
      }
    });

    worker.startRender({
      fps: 30,
      width: 16,
      height: 16,
      durationMs: 10000 as never,
    });

    await done;

    expect(stopIssued).toBe(true);
    expect(seen.length).toBeLessThan(TOTAL_FRAMES_REQUESTED);
    expect(seen.length).toBeGreaterThanOrEqual(STOP_AT_FRAME + 1);

    worker.dispose();
  });

  // Coarse wall-clock smoke for targetFps pacing: 10 frames at targetFps=40
  // budget at least 25ms apiece, so the paced render cannot complete in
  // under ~250ms. The unpaced default finishes the same workload in single-
  // digit milliseconds, so a generous 200ms floor is flake-safe while still
  // proving pacing engaged. Exact budget math lives in the component suite
  // under fake timers (tests/component/render-worker.test.ts).
  test('targetFps paces wall-clock frame emission', async () => {
    const worker = RenderWorker.create({ targetFps: 40 });

    await waitForWorkerReady(worker);

    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const offscreen = canvas.transferControlToOffscreen();
    worker.transferCanvas(offscreen);

    const frames: number[] = [];
    worker.onFrame((output) => {
      frames.push((output as { frame: number }).frame);
    });

    const done = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out waiting for paced render-complete')), 5000);
      worker.onComplete(() => {
        clearTimeout(timer);
        resolve();
      });
    });

    const startedAt = performance.now();
    worker.startRender({
      fps: 10,
      width: 16,
      height: 16,
      durationMs: 1000 as never,
    });

    await done;
    const elapsedMs = performance.now() - startedAt;

    expect(frames.length).toBe(10);
    expect(elapsedMs).toBeGreaterThanOrEqual(200);

    worker.dispose();
  });

  test('onFrame returns an unsubscribe function that stops callbacks', async () => {
    const worker = RenderWorker.create();

    await waitForWorkerReady(worker);

    let callCount = 0;
    const unsub = worker.onFrame(() => {
      callCount++;
    });

    unsub();

    // Even if frames arrive, callback should not fire
    expect(callCount).toBe(0);
    worker.dispose();
  });

  test('onComplete returns an unsubscribe function', async () => {
    const worker = RenderWorker.create();

    await waitForWorkerReady(worker);

    let called = false;
    const unsub = worker.onComplete(() => {
      called = true;
    });

    unsub();
    expect(called).toBe(false);
    worker.dispose();
  });

  test('frame output includes frame number, timestamp, and state', async () => {
    const worker = RenderWorker.create();

    await waitForWorkerReady(worker);

    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const offscreen = canvas.transferControlToOffscreen();
    worker.transferCanvas(offscreen);

    const firstFrame = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out waiting for first frame')), 5000);
      const unsub = worker.onFrame((output) => {
        clearTimeout(timer);
        unsub();
        resolve(output as unknown as Record<string, unknown>);
      });
      worker.startRender({ fps: 10, width: 16, height: 16, durationMs: 100 as never });
    });

    expect(firstFrame).toHaveProperty('frame');
    expect(firstFrame).toHaveProperty('timestamp');
    expect(firstFrame).toHaveProperty('state');

    worker.dispose();
  });
  });
});
