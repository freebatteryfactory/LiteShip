/**
 * @czap/stage package smoke test.
 *
 * Pins the public export surface of the visual-compiler package: the three
 * top-level casters (`dualExport`, `exportVideo`, `exportVideoEncoded`) and the
 * `@czap/stage/ffmpeg` subpath's headless encoder seam (`ffmpegFrameEncoder`,
 * `ffmpegEncodeAvailable`, `probeFfmpegEncode`). A smoke test, so it only asserts
 * the exports EXIST and are callable shapes — no real render/encode is driven.
 */

import { describe, test, expect } from 'vitest';
import { dualExport, exportVideo, exportVideoEncoded } from '@czap/stage';
import { ffmpegFrameEncoder, ffmpegEncodeAvailable, probeFfmpegEncode } from '@czap/stage/ffmpeg';

describe('@czap/stage smoke', () => {
  test('top-level casters are exported as callable functions', () => {
    expect(typeof dualExport).toBe('function');
    expect(typeof exportVideo).toBe('function');
    expect(typeof exportVideoEncoded).toBe('function');
  });

  test('@czap/stage/ffmpeg exposes the headless encoder seam', () => {
    expect(typeof ffmpegFrameEncoder).toBe('function');
    expect(typeof ffmpegEncodeAvailable).toBe('function');
    expect(typeof probeFfmpegEncode).toBe('function');
  });

  test('ffmpegFrameEncoder() returns a FrameEncoder (an async (frames, config) function)', () => {
    // No render is driven; only the structural shape of the adapter is asserted.
    const encoder = ffmpegFrameEncoder();
    expect(typeof encoder).toBe('function');
    // FrameEncoder is `(frames, config) => Promise<EncodedVideo>` — arity 2.
    expect(encoder.length).toBe(2);
  });

  test('ffmpegEncodeAvailable() answers a boolean (no throw on probe)', () => {
    // Whether ffmpeg is present or not, the availability check must resolve to a
    // boolean rather than throwing — it gates the optional encode path.
    expect(typeof ffmpegEncodeAvailable()).toBe('boolean');
  });
});
