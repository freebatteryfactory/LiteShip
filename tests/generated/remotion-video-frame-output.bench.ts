// GENERATED — do not edit by hand
import { bench } from 'vitest';
import { Effect } from 'effect';
import { Compositor, Millis } from '../../packages/core/src/index.js';
import { rendererFromRemotionConfig, precomputeFrames } from '../../packages/remotion/src/composition.js';

const renderer = Effect.runSync(
  Effect.scoped(
    Effect.gen(function* () {
      const compositor = yield* Compositor.create();
      return rendererFromRemotionConfig({ fps: 30, width: 64, height: 64, durationMs: Millis(100) }, compositor);
    }),
  ),
);

bench(`remotion.video-frame-output — precomputeFrames round trip`, async () => {
  await precomputeFrames(renderer);
}, { time: 500 });
