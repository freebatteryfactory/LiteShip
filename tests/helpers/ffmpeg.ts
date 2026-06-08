/**
 * Shared ffmpeg render gate for integration/smoke tests.
 * Matches CI (Ubuntu apt ffmpeg + libx264) and `czap doctor` probe.
 *
 * @module
 */
import { ffmpegRenderCapable } from '@czap/command/host';

/** True when scene render can encode via libx264 (not merely `ffmpeg -version`). */
export const FFMPEG_RENDER_CAPABLE = ffmpegRenderCapable();
