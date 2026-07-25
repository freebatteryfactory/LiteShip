/** Stateful schedule properties for the public Scene runtime. */

import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { SceneRuntime, type CompiledScene } from '@liteship/scene';

function emptyScene(fps: number): CompiledScene {
  return {
    name: 'property-scene',
    duration: 60_000,
    fps,
    trackSpawns: [],
    beats: [],
  };
}

describe('@liteship/scene runtime schedules', () => {
  test('non-negative elapsed-time schedules are deterministic and frame-monotone', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 240 }),
        fc.array(fc.integer({ min: 0, max: 1_000 }), { minLength: 1, maxLength: 48 }),
        async (fps, schedule) => {
          const left = await SceneRuntime.build(emptyScene(fps));
          const right = await SceneRuntime.build(emptyScene(fps));
          let elapsed = 0;
          let priorFrame = 0;
          try {
            for (const dtMs of schedule) {
              elapsed += dtMs;
              await left.tick(dtMs);
              await right.tick(dtMs);
              const expectedFrame = Math.floor((elapsed / 1_000) * fps);
              expect(left.currentTimeMs()).toBe(elapsed);
              expect(left.currentFrame()).toBe(expectedFrame);
              expect(right.currentFrame()).toBe(expectedFrame);
              expect(left.currentFrame()).toBeGreaterThanOrEqual(priorFrame);
              priorFrame = left.currentFrame();
            }
          } finally {
            await left.release();
            await right.release();
          }
        },
      ),
      { seed: 0x5eed_1810, numRuns: 120 },
    );
  });

  test.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1])(
    'refuses corrupt elapsed-time input %s without advancing the clock',
    async (dtMs) => {
      const runtime = await SceneRuntime.build(emptyScene(60));
      try {
        await expect(runtime.tick(dtMs)).rejects.toThrow(/finite, non-negative/u);
        expect(runtime.currentTimeMs()).toBe(0);
        expect(runtime.currentFrame()).toBe(0);
      } finally {
        await runtime.release();
      }
    },
  );
});
