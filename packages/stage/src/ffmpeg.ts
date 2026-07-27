/**
 * `@liteship/stage/ffmpeg` — the NODE-only headless byte-encode backend.
 *
 * Kept off the main `@liteship/stage` entry so the pure graph-walk core never pulls
 * `node:child_process`/`node:fs`. Inject the encoder at the call site:
 *
 * ```ts
 * import { exportVideoEncoded } from '@liteship/stage';
 * import { ffmpegFrameEncoder, ffmpegEncodeAvailable } from '@liteship/stage/ffmpeg';
 *
 * if (ffmpegEncodeAvailable()) {
 *   const { encoded } = await exportVideoEncoded(graph, ffmpegFrameEncoder());
 *   // encoded.bytes is a real, ffprobe-validatable MP4
 * }
 * ```
 *
 * @module
 */

export { ffmpegFrameEncoder, ffmpegEncodeAvailable, probeFfmpegEncode } from './ffmpeg-encoder.js';
export type { FfmpegEncoderOptions, FfmpegEncodeProbe } from './ffmpeg-encoder.js';
