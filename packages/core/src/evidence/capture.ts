/**
 * Capture types -- the contract between frame rendering and video encoding.
 *
 * `FrameCapture` is the owned encoder abstraction used by browser capture.
 * VideoRenderer produces frames; a host-owned capture consumes and releases them.
 *
 * @module
 */

import type { Millis } from '../schema/brands.js';
import type { AsyncOwnedResource } from '../reactive/lifetime.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Encoder-facing configuration: target resolution and frame rate. */
export interface CaptureConfig {
  readonly width: number;
  readonly height: number;
  readonly fps: number;
}

/** Single pre-rendered frame handed to a {@link FrameCapture} — frame number, timestamp, and pixel source. */
export interface CaptureFrame {
  readonly frame: number;
  readonly timestamp: number;
  readonly bitmap: ImageBitmap | OffscreenCanvas;
}

/**
 * Minimal encoder contract: `init` to open the encoder, `capture` per frame,
 * `finalize` to flush and return the encoded blob, plus LiteShip's one async
 * owned-resource lifecycle. `finalize` is terminal and releases the encoder;
 * callers may dispose earlier to abort safely.
 */
export interface FrameCapture extends AsyncOwnedResource {
  readonly _tag: 'FrameCapture';
  init(config: CaptureConfig): Promise<void>;
  capture(frame: CaptureFrame): Promise<void>;
  finalize(): Promise<CaptureResult>;
}

/** Encoder output returned from {@link FrameCapture}.`finalize`: the encoded blob plus codec metadata. */
export interface CaptureResult {
  readonly blob: Blob;
  readonly codec: string;
  readonly frames: number;
  readonly durationMs: Millis;
}
