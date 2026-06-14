/**
 * Remotion hooks -- React bindings for CompositeState in Remotion compositions.
 *
 * @module
 */

import type { CompositeState, VideoFrameOutput } from '@czap/core';
import { Diagnostics } from '@czap/core';
import { useCurrentFrame } from 'remotion';

// ---------------------------------------------------------------------------
// CSS var extraction
// ---------------------------------------------------------------------------

/**
 * Convert `CompositeState.outputs.css` into a flat CSS custom property map.
 *
 * The returned record is suitable for use directly as a React `style` prop
 * or a Remotion `style` prop -- every key is a CSS variable name (e.g.
 * `--czap-color-fg`) and every value is coerced to a string.
 *
 * @param state - A composite state produced by a `VideoRenderer` frame.
 * @returns A flat `{ [cssVar]: string }` map.
 *
 * @example
 * ```tsx
 * const vars = cssVarsFromState(state);
 * return <div style={vars}>...</div>;
 * ```
 */
export function cssVarsFromState(state: CompositeState): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(state.outputs.css)) {
    result[key] = String(value);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Frame-indexed state lookup
// ---------------------------------------------------------------------------

/**
 * Look up the `CompositeState` for a given frame index from precomputed
 * frames.
 *
 * Clamps to valid range: negative indices return the first frame; indices
 * past the end return the last frame. An empty `frames` array yields a
 * structurally-empty `CompositeState` so callers never have to guard for
 * undefined output. Both degraded paths emit a warn-once diagnostic
 * (overflow usually means fps/durationMs drifted from `durationInFrames`).
 *
 * @param frames - Output of {@link precomputeFrames}.
 * @param frameIndex - Zero-based frame index (typically from Remotion's
 *   `useCurrentFrame`).
 * @returns The state at the clamped frame.
 *
 * @example
 * ```ts
 * const state = stateAtFrame(frames, 42);
 * ```
 */
export function stateAtFrame(frames: ReadonlyArray<VideoFrameOutput>, frameIndex: number): CompositeState {
  if (frames.length === 0) {
    Diagnostics.warnOnce({
      source: 'czap/remotion',
      code: 'no-frames',
      message:
        'stateAtFrame received 0 frames — did precomputeFrames run? Await it before render (e.g. in calculateMetadata) and pass its result through unmodified.',
    });
    return { discrete: {}, blend: {}, outputs: { css: {}, glsl: {}, wgsl: {}, aria: {} } };
  }
  if (frameIndex > frames.length - 1) {
    // Dedup key stays frame-independent — this fires on every frame past the
    // end during a render; the offending index travels in `detail`.
    Diagnostics.warnOnce({
      source: 'czap/remotion',
      code: 'frame-overflow',
      message: `stateAtFrame: Remotion asked for a frame past the ${frames.length} precomputed frames — the video will freeze on the last state. Probable cause: VideoConfig fps/durationMs does not match this composition's durationInFrames. Fix: durationMs = Millis(durationInFrames / fps * 1000), or build the renderer with rendererFromRemotionConfig().`,
      detail: { frameIndex, frameCount: frames.length },
    });
  }
  const clamped = Math.max(0, Math.min(frameIndex, frames.length - 1));
  return frames[clamped]!.state;
}

// ---------------------------------------------------------------------------
// React hook (requires remotion peer dependency)
// ---------------------------------------------------------------------------

/**
 * Remotion-aware hook that returns the `CompositeState` for the current
 * frame. Internally calls Remotion's `useCurrentFrame` and defers to
 * {@link stateAtFrame} for lookup.
 *
 * This is the explicit prop-threading half of a deliberate pair: pass the
 * `frames` array directly — pure, no provider required. Its sibling,
 * `Provider` + `useCzapState()` in `composition.js`, resolves the same
 * state via implicit context lookup for deep component trees. Both clamp
 * to the valid frame range and fall back to a structurally-empty
 * `CompositeState`.
 *
 * @param frames - Precomputed frames (see {@link precomputeFrames}).
 * @returns State for the current Remotion frame.
 *
 * @see useCzapState for the context-lookup form (no prop threading).
 *
 * @example
 * ```tsx
 * import { cssVarsFromState, useCompositeState } from '@czap/remotion';
 *
 * function MyComposition({ frames }: { frames: VideoFrameOutput[] }) {
 *   const state = useCompositeState(frames);
 *   const vars = cssVarsFromState(state);
 *   return <div style={vars}>...</div>;
 * }
 * ```
 */
export function useCompositeState(frames: ReadonlyArray<VideoFrameOutput>): CompositeState {
  const frame = useCurrentFrame();
  return stateAtFrame(frames, frame);
}
