/**
 * Motion export — the `@liteship/stage` video-leg MOTION ADAPTER for authored motion.
 *
 * The video export samples the ONE shared kernel `sampleProgram` (`@liteship/core`, Law 4)
 * at each `FrameRange` index and folds the sampled leaves into per-frame content, then
 * content-addresses the whole track through the SAME `CanonicalCbor.encode` →
 * `AddressedDigest.of` kernel the dual-export video carrier uses. The
 * digest IS the built-in oracle for the video leg: two graphs whose authored motion
 * differs address differently, and a frame stream that matches the browser floor
 * addresses identically to one produced from the same program.
 *
 * ADDITIVE to `dual-export.ts`'s video-CROSSFADE carrier — it does not touch
 * `produceVideoFrames` / `TransitionSystem`; authored-motion sampling and the crossfade
 * `_blend` are different concepts: motion is an authored intent lowered through the ONE
 * shared kernel, the crossfade is a compositor mix factor between two entities.
 *
 * @module
 */

import { CanonicalCbor, AddressedDigest, formatTypedValue, frameToT, sampleProgram } from '@liteship/core';
import type { AddressedDigest as AddressedDigestShape, RuntimeWritePlan, TypedValue } from '@liteship/core';
import { ValidationError } from '@liteship/error';

/** One sampled motion frame: its index, its normalized `t`, and the typed + formatted leaves. */
export interface MotionFrameSample {
  /** Frame index in `[0, totalFrames)`. */
  readonly frame: number;
  /** Normalized program time `frame / max(1, totalFrames-1)` — endpoint-inclusive. */
  readonly t: number;
  /** Typed leaf values (the oracle compares these against the `sampleProgram` reference). */
  readonly values: ReadonlyMap<string, TypedValue>;
  /** The same leaves formatted for frame content (what the encoded video/CSS actually carries). */
  readonly css: Readonly<Record<string, string>>;
}

/** A content-addressed authored-motion track: the per-frame samples plus their artifact digest. */
export interface MotionTrackExport {
  readonly totalFrames: number;
  readonly frames: readonly MotionFrameSample[];
  /** Content address of the folded per-frame motion content (the video leg's built-in oracle). */
  readonly artifactDigest: AddressedDigestShape;
}

function requireFrameCount(totalFrames: number): void {
  if (!Number.isSafeInteger(totalFrames) || totalFrames < 0) {
    throw ValidationError(
      'sampleMotionFrames',
      `totalFrames must be a non-negative safe integer; received ${String(totalFrames)}.`,
    );
  }
}

/**
 * Sample the shared motion kernel at every frame index of a `totalFrames`-long export.
 * Each frame's normalized time is `frame / max(1, totalFrames-1)`, so the endpoints land
 * exactly on `t=0` and `t=1`. Pure — the differential oracle reads the typed `values` to
 * prove the stage/remotion video leg equals the `sampleProgram` reference within epsilon.
 * Refuses a frame count that is negative, fractional, non-finite, or outside the safe-integer domain.
 */
export function sampleMotionFrames(plan: RuntimeWritePlan, totalFrames: number): readonly MotionFrameSample[] {
  requireFrameCount(totalFrames);
  const frames: MotionFrameSample[] = [];
  for (let frame = 0; frame < totalFrames; frame++) {
    const t = frameToT(frame, totalFrames);
    const sample = sampleProgram(plan, t);
    const values = new Map<string, TypedValue>();
    const css: Record<string, string> = {};
    for (const { cssVar, value } of sample) {
      values.set(cssVar, value);
      css[cssVar] = formatTypedValue(value);
    }
    frames.push({ frame, t, values, css });
  }
  return frames;
}

/**
 * Cast an authored motion program to a content-addressed video track: sample every frame
 * (see {@link sampleMotionFrames}), then content-address the folded per-frame CSS through
 * the ONE kernel (`CanonicalCbor.encode` → `AddressedDigest.of`). The returned
 * `artifactDigest` pins the exact motion the frames carry — the built-in oracle for the
 * video leg, exactly as `dual-export.ts` content-addresses its frame stream.
 * Frame-count admission is identical to {@link sampleMotionFrames}; malformed counts never mint partial artifacts.
 */
export function exportMotionTrack(plan: RuntimeWritePlan, totalFrames: number): MotionTrackExport {
  const frames = sampleMotionFrames(plan, totalFrames);
  const artifactDigest = AddressedDigest.of(
    CanonicalCbor.encode({
      _tag: 'MotionTrackArtifact',
      _version: 1,
      totalFrames,
      frames: frames.map((f) => ({ frame: f.frame, css: f.css })),
    }),
  );
  return { totalFrames, frames, artifactDigest };
}
