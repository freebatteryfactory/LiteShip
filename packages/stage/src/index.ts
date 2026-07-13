/**
 * `@czap/stage` — the verb / orchestration layer.
 *
 * Core stays pure (nouns: the addressed `DocumentGraph` IR and its kernel).
 * Stage owns the verbs that CAST one graph to many carriers, reusing the
 * existing casters (`CSSCompiler`, the astro satellite helpers, `VideoRenderer`)
 * and the one identity kernel (`CanonicalCbor` → `AddressedDigest`). Its jewel
 * is {@link dualExport}: prove one source graph casts to a static Astro page AND
 * a video, both derived from the same `DocumentGraph.digest`, joined under one
 * parent merge receipt.
 *
 * @module
 */

export { exportAstroPage, exportVideo, exportVideoEncoded, dualExport, dualExportNode } from './dual-export.js';
export type {
  DualExportResult,
  DualExportNodeResult,
  EncodedVideoExport,
  EncodedVideo,
  VideoEncodeConfig,
  FrameEncoder,
} from './dual-export.js';

// Authored-motion video-leg adapter (#130): samples the ONE shared `sampleProgram`
// kernel per FrameRange index and content-addresses the folded frames — ADDITIVE to
// the video-crossfade carrier above, never a merge.
export { sampleMotionFrames, exportMotionTrack } from './motion-export.js';
export type { MotionFrameSample, MotionTrackExport } from './motion-export.js';

// The headless ffmpeg byte-encode backend lives on the node-only `./ffmpeg`
// subpath (it imports `node:child_process`/`node:fs`); the main entry above
// stays node-free so the pure graph-walk is importable anywhere. Inject the
// adapter at the call site: `exportVideoEncoded(graph, ffmpegFrameEncoder())`.
