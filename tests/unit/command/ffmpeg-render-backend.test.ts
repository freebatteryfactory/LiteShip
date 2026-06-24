/**
 * `renderWithFfmpeg` — the SHIPPING `scene render` backend, proven to paint REAL
 * pixels from each frame's CompositeState (the smoking-gun fix) and to measure its
 * duration with an injected MONOTONIC clock.
 *
 * The old backend emitted an opaque BLACK RGBA buffer for every frame, so the
 * graph's poses never reached the video. Now it paints through the shared
 * `compositeStateToRgba` painter, so:
 *
 *   - the encoded mp4's pixels are NON-BLACK and DERIVED from the frame state
 *     (verified by decoding frame 0 back to raw RGB via ffmpeg);
 *   - `elapsedMs` is read from the injected clock (a `manualClock` here), proving
 *     it is a monotonic DURATION, not a wall-clock `Date.now()` interval.
 *
 * Codec-gated: encoding/decoding needs ffmpeg+libx264. Absent → an env-gated skip
 * (NOT a silent pass), via the CI-aligned `FFMPEG_RENDER_CAPABLE` probe.
 */

import { describe, test, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { manualClock } from '@czap/core';
import type { CompositeState, VideoFrameOutput } from '@czap/core';
import { renderWithFfmpeg } from '@czap/command/host';
import { FFMPEG_RENDER_CAPABLE } from '../../helpers/ffmpeg.js';

function frame(n: number, discrete: Record<string, string>): VideoFrameOutput {
  const state: CompositeState = { discrete, blend: {}, outputs: { css: {}, glsl: {}, wgsl: {}, aria: {} } };
  return { frame: n, timestamp: n, progress: 0, state };
}

/** Decode frame 0 of an mp4 to raw RGB24 bytes via ffmpeg, returning the first pixel. */
function firstPixelRgb(mp4Path: string): { r: number; g: number; b: number } {
  const raw = execFileSync(
    'ffmpeg',
    ['-v', 'error', '-i', mp4Path, '-frames:v', '1', '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  return { r: raw[0]!, g: raw[1]!, b: raw[2]! };
}

const RUN = FFMPEG_RENDER_CAPABLE;

describe('renderWithFfmpeg — real pixels from frame state + monotonic duration', () => {
  if (!RUN) {
    test.skip('ffmpeg+libx264 render (skipped — codec not on PATH)', () => {
      console.warn(
        '[command/ffmpeg-render-backend] SKIPPED: ffmpeg with libx264 is not available on PATH. ' +
          'The shipping render-backend pixel test cannot prove real video bytes here. Install ffmpeg ' +
          '(CI: apt install ffmpeg on Ubuntu). This is an env-gated skip, NOT a pass.',
      );
    });
    return;
  }

  test('encodes NON-BLACK pixels derived from each frame CompositeState', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'czap-render-backend-'));
    const output = join(dir, 'out.mp4');
    try {
      // Two distinct discrete states → two distinct painted colors.
      async function* frames(): AsyncGenerator<VideoFrameOutput> {
        yield frame(0, { viewport: 'mobile' });
        yield frame(1, { viewport: 'desktop' });
      }
      const result = await renderWithFfmpeg(frames(), { output, width: 16, height: 16, fps: 2 });
      expect(result.frameCount).toBe(2);

      // The mp4 is a real, non-empty file.
      const bytes = readFileSync(output);
      expect(bytes.byteLength).toBeGreaterThan(0);

      // Frame 0's first pixel is NOT black — it carries the painted state color.
      // (The old stub produced r=g=b=0 for every pixel.)
      const px = firstPixelRgb(output);
      expect(px.r + px.g + px.b).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('two different graph states encode to two different first-frame colors', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'czap-render-backend-'));
    const a = join(dir, 'a.mp4');
    const b = join(dir, 'b.mp4');
    try {
      async function* onlyMobile(): AsyncGenerator<VideoFrameOutput> {
        yield frame(0, { viewport: 'mobile' });
      }
      async function* onlyDesktop(): AsyncGenerator<VideoFrameOutput> {
        yield frame(0, { viewport: 'desktop' });
      }
      await renderWithFfmpeg(onlyMobile(), { output: a, width: 16, height: 16, fps: 1 });
      await renderWithFfmpeg(onlyDesktop(), { output: b, width: 16, height: 16, fps: 1 });

      const pa = firstPixelRgb(a);
      const pb = firstPixelRgb(b);
      // Distinct graph state → distinct video pixels (allowing for h264 rounding,
      // at least one channel differs meaningfully).
      const delta = Math.abs(pa.r - pb.r) + Math.abs(pa.g - pb.g) + Math.abs(pa.b - pb.b);
      expect(delta).toBeGreaterThan(8);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('elapsedMs is read from the injected (monotonic) clock — a duration, not Date.now', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'czap-render-backend-'));
    const output = join(dir, 'out.mp4');
    try {
      // A manual clock advances by a fixed amount across the two reads the backend
      // makes (start + end), so elapsedMs is EXACTLY that advance — proving the
      // value comes from the injected clock, never an ambient wall-clock read.
      let t = 1000;
      const clock = manualClock(t);
      const realNow = clock.now.bind(clock);
      // Wrap now() to advance 42ms on the second read (end - start = 42).
      let reads = 0;
      const wrapped = {
        now: (): number => {
          const v = realNow();
          reads += 1;
          if (reads === 1) clock.set((t += 42));
          return v;
        },
        advance: clock.advance,
        set: clock.set,
      };

      async function* frames(): AsyncGenerator<VideoFrameOutput> {
        yield frame(0, { viewport: 'mobile' });
      }
      const result = await renderWithFfmpeg(frames(), { output, width: 16, height: 16, fps: 1, clock: wrapped });
      expect(result.elapsedMs).toBe(42);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
