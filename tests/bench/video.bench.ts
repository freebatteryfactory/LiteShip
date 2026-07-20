/**
 * Video rendering benchmarks -- scheduler, VideoRenderer, Compositor hot loop.
 */

import { Bench } from 'tinybench';
// The quantizer seam is fully synchronous: the base contract exposes `stateSync`
// (the compositor's preferred hot-path accessor) and `evaluate`; the reactive
// CellKernel `state` lives on ReactiveQuantizer, which this fixture doesn't need.
// Compositor.create/add/compute went synchronous in the core-seams wave.
import { Scheduler, VideoRenderer, Compositor, Boundary, Millis } from '@liteship/core';

const bench = new Bench({ warmupIterations: 50 });

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const widthBoundary = Boundary.make({
  input: 'viewport.width',
  at: [
    [0, 'mobile'],
    [768, 'tablet'],
    [1024, 'desktop'],
  ] as const,
});

function makeQuantizer(boundary: Boundary) {
  let currentState = boundary.states[0] as string;
  return {
    boundary,
    stateSync: () => currentState,
    changes: null as never,
    evaluate(value: number) {
      currentState = Boundary.evaluate(boundary, value) as string;
      return currentState;
    },
  };
}

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

bench.add('FixedStepScheduler -- 1000 steps @ 60fps', () => {
  const sched = Scheduler.fixedStep(60);
  let count = 0;
  sched.schedule(() => {
    count++;
  });
  for (let i = 0; i < 1000; i++) {
    sched.step();
    sched.schedule(() => {
      count++;
    });
  }
});

bench.add('VideoRenderer -- 30 frames @ 30fps', async () => {
  const compositor = Compositor.create().compositor;
  const renderer = VideoRenderer.make({ fps: 30, width: 1920, height: 1080, durationMs: Millis(1000) }, compositor);
  for await (const _ of renderer.frames()) {
    /* consume */
  }
});

bench.add('VideoRenderer -- 300 frames @ 60fps', async () => {
  const compositor = Compositor.create().compositor;
  const renderer = VideoRenderer.make({ fps: 60, width: 1920, height: 1080, durationMs: Millis(5000) }, compositor);
  for await (const _ of renderer.frames()) {
    /* consume */
  }
});

const blendTreeCompositor = (() => {
  const c = Compositor.create().compositor;
  c.add('viewport', makeQuantizer(widthBoundary));
  c.add('layout', makeQuantizer(widthBoundary));
  c.add('theme', makeQuantizer(widthBoundary));
  return c;
})();

bench.add('Compositor.compute() -- hot loop with 3-quantizer blend tree (100 calls)', () => {
  for (let i = 0; i < 100; i++) {
    blendTreeCompositor.compute();
  }
});

bench.add('Compositor.compute() -- hot loop (100 calls)', () => {
  const c = Compositor.create().compositor;
  for (let i = 0; i < 100; i++) {
    c.compute();
  }
});

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

await bench.run();
console.table(bench.table());
