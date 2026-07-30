import { afterEach, describe, expect, test, vi } from 'vitest';
import fc from 'fast-check';
import {
  Compositor,
  Lifetime,
  Millis,
  attachLifetime,
  createFrameSchedule,
  createVideoRenderer,
  type CaptureFrame,
  type FrameCapture,
} from '@liteship/core';
import { precomputeFrames, rendererFromRemotionConfig } from '@liteship/remotion';
import { captureVideo } from '@liteship/web';

afterEach(() => vi.unstubAllGlobals());

describe('shared frame schedule laws', () => {
  test('VideoRenderer is an exact state projection over FrameSchedule coordinates', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 60 }), fc.integer({ min: 0, max: 5_000 }), async (fps, durationMs) => {
        const config = { fps, width: 1, height: 1, durationMs: Millis(durationMs) };
        const schedule = createFrameSchedule(config);
        const compositor = Compositor.create();
        try {
          const actual = await precomputeFrames(createVideoRenderer(config, compositor));
          expect(actual.map(({ frame, timestamp, progress }) => ({ frame, timestamp, progress }))).toEqual([
            ...schedule,
          ]);
        } finally {
          await compositor.dispose();
        }
      }),
      { numRuns: 50 },
    );
  });

  test('Remotion indexing derives the same schedule without a duplicate timing declaration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 60 }),
        fc.integer({ min: 0, max: 180 }),
        async (fps, durationInFrames) => {
          const compositor = Compositor.create();
          const renderer = rendererFromRemotionConfig({ fps, width: 1, height: 1, durationInFrames }, compositor);
          expect(renderer.schedule.totalFrames).toBe(durationInFrames);
          expect(renderer.totalFrames).toBe(renderer.schedule.totalFrames);
          await compositor.dispose();
        },
      ),
      { numRuns: 100 },
    );
  });

  test('Web capture forwards the same schedule coordinates to its encoder adapter', async () => {
    class FakeOffscreenCanvas {
      constructor(
        readonly width: number,
        readonly height: number,
      ) {}
      getContext(): object {
        return {};
      }
    }
    vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas);

    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 30 }), fc.integer({ min: 0, max: 2_000 }), async (fps, durationMs) => {
        const config = { fps, width: 1, height: 1, durationMs: Millis(durationMs) };
        const compositor = Compositor.create();
        const seen: Array<Pick<CaptureFrame, 'frame' | 'timestamp'>> = [];
        const capture = attachLifetime(
          {
            _tag: 'FrameCapture' as const,
            async init() {},
            async capture(frame: CaptureFrame) {
              seen.push({ frame: frame.frame, timestamp: frame.timestamp });
            },
            async finalize() {
              return { blob: new Blob(), codec: 'fixture', frames: seen.length, durationMs: config.durationMs };
            },
          },
          Lifetime.make(),
        ) satisfies FrameCapture;
        try {
          const renderer = createVideoRenderer(config, compositor);
          await captureVideo(renderer, capture, () => {});
          expect(seen).toEqual([...renderer.schedule].map(({ frame, timestamp }) => ({ frame, timestamp })));
        } finally {
          await compositor.dispose();
        }
      }),
      { seed: 0xd3_2027, numRuns: 40 },
    );
  });
});
