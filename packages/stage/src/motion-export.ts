/**
 * Motion export — the `@czap/stage` video-leg MOTION ADAPTER for authored motion.
 *
 * The video export samples the ONE shared kernel `sampleProgram` (`@czap/core`, Law 4)
 * at each `FrameRange` index and folds the sampled leaves into per-frame content, then
 * content-addresses the whole track through the SAME `CanonicalCbor.encode` →
 * `AddressedDigest.of` kernel the dual-export video carrier uses (ADR-0003/0011). The
 * digest IS the built-in oracle for the video leg: two graphs whose authored motion
 * differs address differently, and a frame stream that matches the browser floor
 * addresses identically to one produced from the same program.
 *
 * ADDITIVE to `dual-export.ts`'s video-CROSSFADE carrier — it does not touch
 * `produceVideoFrames` / `TransitionSystem`; authored-motion sampling and the crossfade
 * `_blend` are different concepts (ADR-0035/0039, and the new parity ADR).
 *
 * @module
 */

import { CanonicalCbor, AddressedDigest, formatTypedValue, sampleProgram } from '@czap/core';
import type { AddressedDigest as AddressedDigestShape, RuntimeWritePlan, TypedValue } from '@czap/core';

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

/** Map a frame index onto the program's normalized `[0,1]` timeline (endpoint-inclusive). */
function frameToT(frameIndex: number, totalFrames: number): number {
  const denom = Math.max(1, totalFrames - 1);
  const raw = frameIndex / denom;
  return raw < 0 ? 0 : raw > 1 ? 1 : raw;
}

/**
 * Sample the shared motion kernel at every frame index of a `totalFrames`-long export.
 * Each frame's normalized time is `frame / max(1, totalFrames-1)`, so the endpoints land
 * exactly on `t=0` and `t=1`. Pure — the differential oracle reads the typed `values` to
 * prove the stage/remotion video leg equals the `sampleProgram` reference within epsilon.
 */
export function sampleMotionFrames(plan: RuntimeWritePlan, totalFrames: number): readonly MotionFrameSample[] {
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
