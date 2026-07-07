/**
 * Video rendering benchmarks -- scheduler, VideoRenderer, Compositor hot loop.
 */

import { Bench } from 'tinybench';
import { Effect } from 'effect';
import { Scheduler, VideoRenderer, Compositor, Boundary, Millis } from '@czap/core';

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

function makeQuantizer(boundary: Boundary.Shape) {
  let currentState = boundary.states[0] as string;
  return {
    boundary,
    state: Effect.succeed(currentState),
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
  const compositor = Effect.runSync(Effect.scoped(Compositor.create()));
  const renderer = VideoRenderer.make({ fps: 30, width: 1920, height: 1080, durationMs: Millis(1000) }, compositor);
  for await (const _ of renderer.frames()) {
    /* consume */
  }
});

bench.add('VideoRenderer -- 300 frames @ 60fps', async () => {
  const compositor = Effect.runSync(Effect.scoped(Compositor.create()));
  const renderer = VideoRenderer.make({ fps: 60, width: 1920, height: 1080, durationMs: Millis(5000) }, compositor);
  for await (const _ of renderer.frames()) {
    /* consume */
  }
});

bench.add('Compositor.compute() -- hot loop with 3-quantizer blend tree (100 calls)', () => {
  Effect.runSync(
    Effect.scoped(
      Effect.gen(function* () {
        const c = yield* Compositor.create();
        yield* c.add('viewport', makeQuantizer(widthBoundary));
        yield* c.add('layout', makeQuantizer(widthBoundary));
        yield* c.add('theme', makeQuantizer(widthBoundary));
        for (let i = 0; i < 100; i++) {
          yield* c.compute();
        }
      }),
    ),
  );
});

bench.add('Compositor.compute() -- hot loop (100 calls)', () => {
  Effect.runSync(
    Effect.scoped(
      Effect.gen(function* () {
        const c = yield* Compositor.create();
        for (let i = 0; i < 100; i++) {
          yield* c.compute();
        }
      }),
    ),
  );
});

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

await bench.run();
console.table(bench.table());
