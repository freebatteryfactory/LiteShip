/**
 * @liteship/remotion type spine -- React adapter for Remotion video rendering.
 */

import type { CompositeState, Compositor, ControllableSignal, VideoFrameOutput, VideoRenderer } from './core';

// ═══════════════════════════════════════════════════════════════════════════════
// § 1. CSS VARS
// ═══════════════════════════════════════════════════════════════════════════════

export declare function cssVarsFromState(state: CompositeState): Record<string, string>;

// ═══════════════════════════════════════════════════════════════════════════════
// § 2. FRAME LOOKUP
// ═══════════════════════════════════════════════════════════════════════════════

export declare function stateAtFrame(frames: ReadonlyArray<VideoFrameOutput>, frameIndex: number): CompositeState;

// ═══════════════════════════════════════════════════════════════════════════════
// § 3. REMOTION HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export declare function useCompositeState(frames: ReadonlyArray<VideoFrameOutput>): CompositeState;

// ═══════════════════════════════════════════════════════════════════════════════
// § 4. PRECOMPUTE
// ═══════════════════════════════════════════════════════════════════════════════

export declare function precomputeFrames(renderer: VideoRenderer): Promise<ReadonlyArray<VideoFrameOutput>>;

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
 * declared exactly once — in Remotion. Derives
 * `durationMs = durationInFrames / fps * 1000`.
 */
export declare function rendererFromRemotionConfig(
  config: RemotionVideoConfig,
  compositor: Compositor,
  signal?: ControllableSignal<number>,
): VideoRenderer;

// ═══════════════════════════════════════════════════════════════════════════════
// § 5. CONTEXT PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════

export declare function Provider(props: { frames: ReadonlyArray<VideoFrameOutput>; children: unknown }): unknown;

export declare function useLiteshipState(): CompositeState;
