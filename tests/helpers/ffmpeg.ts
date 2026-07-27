/**
 * Shared ffmpeg render gate for integration/smoke tests.
 * Matches CI (Ubuntu apt ffmpeg + libx264) and `liteship doctor` probe.
 *
 * @module
 */
import { ffmpegRenderCapable } from '@liteship/command/host';

/** True when scene render can encode via libx264 (not merely `ffmpeg -version`). */
export const FFMPEG_RENDER_CAPABLE = ffmpegRenderCapable();

/**
 * `ffmpeg-absent` — the CANONICAL capability probe (export name = capability id). This module is the
 * ffmpeg capability's home (the spawn already runs here for the ffmpeg-gated tests), so it doubles as
 * a capability symbol-table module the gate's linker reads: every ffmpeg-gated skip's guard references
 * `FFMPEG_RENDER_CAPABLE`, so it links to this export through that shared probe symbol. Kept HERE
 * rather than in the node `capabilities.ts` so importing that table never drags the ffmpeg spawn into
 * the wasm/coverage/astro tests. See {@link file://./capabilities.ts}.
 */
export const ffmpegAbsent = !FFMPEG_RENDER_CAPABLE;
