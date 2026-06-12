/**
 * Remotion composition helpers -- precompute frames, context provider.
 *
 * @module
 */

import type { Compositor, Signal, VideoFrameOutput, CompositeState } from '@czap/core';
import { Diagnostics, Millis, VideoRenderer } from '@czap/core';
import { createContext, useContext, createElement } from 'react';
import { useCurrentFrame } from 'remotion';
import { stateAtFrame } from './hooks.js';

// ---------------------------------------------------------------------------
// Frame precomputation
// ---------------------------------------------------------------------------

/**
 * Precompute every {@link VideoFrameOutput} from a `VideoRenderer` into
 * an in-memory array.
 *
 * Call this once on the server (or in a Remotion `calculateMetadata`) before
 * rendering so compositions can index the result by frame number without
 * re-invoking the renderer. The returned array's length is the renderer's
 * total frame count.
 *
 * @param renderer - A `VideoRenderer.Shape` produced by `@czap/core`.
 * @returns Frames in timeline order.
 *
 * @example
 * ```ts
 * const frames = await precomputeFrames(renderer);
 * ```
 */
export async function precomputeFrames(renderer: VideoRenderer.Shape): Promise<ReadonlyArray<VideoFrameOutput>> {
  const frames: VideoFrameOutput[] = [];
  for await (const frame of renderer.frames()) {
    frames.push(frame);
  }
  return frames;
}

/**
 * The timing/resolution shape Remotion already holds — exactly what
 * `useVideoConfig()` and `calculateMetadata` return (extra fields ignored).
 */
export interface RemotionVideoConfig {
  readonly fps: number;
  readonly width: number;
  readonly height: number;
  readonly durationInFrames: number;
}

/**
 * Build a `VideoRenderer` directly from Remotion's video config so timing is
 * declared exactly once — in Remotion.
 *
 * Hand-building `VideoConfig` duplicates fps/duration that Remotion already
 * knows; when the two copies drift, the rendered video silently freezes on
 * the last precomputed frame. This helper derives
 * `durationMs = durationInFrames / fps * 1000`, so drift is impossible.
 *
 * @param config - Remotion's video config (`useVideoConfig()` /
 *   `calculateMetadata` output).
 * @param compositor - The `Compositor` driving the czap state pipeline.
 * @param signal - Optional controllable time signal, seeked per frame.
 * @returns A `VideoRenderer.Shape` ready for {@link precomputeFrames}.
 *
 * @example
 * ```ts
 * const renderer = rendererFromRemotionConfig(videoConfig, compositor);
 * const frames = await precomputeFrames(renderer);
 * ```
 */
export function rendererFromRemotionConfig(
  config: RemotionVideoConfig,
  compositor: Compositor.Shape,
  signal?: Signal.Controllable<number>,
): VideoRenderer.Shape {
  // frames -> ms -> frames must round-trip EXACTLY: the renderer derives its
  // frame count as ceil(durationMs / 1000 * fps), and a float remainder one
  // ULP above the true product adds a phantom frame (1000 @ 30fps -> 1001).
  // When the round trip overshoots, shave one ULP off the duration.
  let durationMs = (config.durationInFrames * 1000) / config.fps;
  if (Math.ceil((durationMs / 1000) * config.fps) > config.durationInFrames) {
    durationMs = durationMs * (1 - Number.EPSILON);
  }
  return VideoRenderer.make(
    {
      fps: config.fps,
      width: config.width,
      height: config.height,
      durationMs: Millis(durationMs),
    },
    compositor,
    signal,
  );
}

// ---------------------------------------------------------------------------
// React context
// ---------------------------------------------------------------------------

const emptyState: CompositeState = {
  discrete: {},
  blend: {},
  outputs: { css: {}, glsl: {}, aria: {} },
};

const CzapContext = createContext<ReadonlyArray<VideoFrameOutput>>([]);

/**
 * React context provider that makes precomputed frames available to
 * {@link useCzapState} anywhere in the subtree. Use this when you prefer
 * implicit frame lookup over threading the `frames` array through props.
 *
 * @example
 * ```tsx
 * <Provider frames={frames}>
 *   <MyComposition />
 * </Provider>
 * ```
 */
export function Provider(props: { frames: ReadonlyArray<VideoFrameOutput>; children: unknown }): unknown {
  return createElement(CzapContext.Provider, { value: props.frames }, props.children);
}

/**
 * Hook that reads the `CompositeState` for the current Remotion frame
 * from the nearest {@link Provider}. Returns a structurally-empty state
 * when no provider is mounted (or it holds no frames) so callers never
 * crash at the boundary; a warn-once diagnostic names the missing
 * `<Provider frames={...}>` so the unstyled render is not silent.
 *
 * This is the implicit context-lookup half of a deliberate pair: mount a
 * {@link Provider} once and call `useCzapState()` anywhere in the subtree
 * — no prop threading. Its sibling, `useCompositeState(frames)` in
 * `hooks.js`, takes the frames array explicitly for shallow trees and
 * pure components. Both clamp to the valid frame range and fall back to a
 * structurally-empty `CompositeState`.
 *
 * @see useCompositeState for the explicit prop-threading form.
 */
export function useCzapState(): CompositeState {
  const frames = useContext(CzapContext);
  const frame = useCurrentFrame();
  if (frames.length === 0) {
    Diagnostics.warnOnce({
      source: 'czap/remotion',
      code: 'no-provider-frames',
      message:
        'useCzapState(): no <Provider frames={...}> found above this component (or it received an empty array) — returning empty state, so your CSS vars will all be missing. Wrap your composition: <Provider frames={frames}><MyComposition /></Provider>, where frames = await precomputeFrames(renderer).',
    });
    return emptyState;
  }
  return stateAtFrame(frames, frame);
}
