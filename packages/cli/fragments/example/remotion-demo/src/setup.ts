/**
 * Demo setup -- boundary definition, compositor wiring, frame precomputation.
 *
 * Defines a 3-state "scale" boundary (small -> medium -> large) that drives
 * CSS custom properties for scale transform, background color, and foreground color.
 * The boundary is driven by a normalized 0-100 progress signal where
 * thresholds fire at 0, 33, and 66.
 *
 * @module
 */

import { Compositor, Millis, VideoRenderer, defineBoundary } from '@liteship/core';
import type { VideoFrameOutput } from '@liteship/core';
import { defineQuantizer, createQuantizer } from '@liteship/quantizer';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const FPS = 30;
export const DURATION_MS = 3000;
export const WIDTH = 1280;
export const HEIGHT = 720;

// ---------------------------------------------------------------------------
// Boundary: 3-state scale with thresholds at 0, 33, 66 (normalized 0-100)
// ---------------------------------------------------------------------------

const scaleBoundary = defineBoundary({
  input: 'progress',
  at: [
    [0, 'small'],
    [33, 'medium'],
    [66, 'large'],
  ],
});

// ---------------------------------------------------------------------------
// Quantizer config: CSS outputs per state
// ---------------------------------------------------------------------------

const scaleQuantizerConfig = defineQuantizer(scaleBoundary, {
  outputs: {
    css: {
      small: { '--scale': 0.5, '--bg': '#1a1a2e', '--fg': '#ffffff' },
      medium: { '--scale': 1.0, '--bg': '#16213e', '--fg': '#ffffff' },
      large: { '--scale': 1.5, '--bg': '#0f3460', '--fg': '#ffffff' },
    },
  },
});

// ---------------------------------------------------------------------------
// buildFrames -- create compositor, add quantizer, precompute all frames
// ---------------------------------------------------------------------------

export async function buildFrames(): Promise<ReadonlyArray<VideoFrameOutput>> {
  // Sync-first (Wave 2): create returns the live instance that owns its own
  // teardown via dispose(); the reactive kernels aren't needed for the pure
  // per-frame compute path here, so we drive the instances directly.
  const compositor = Compositor.create();

  // Materialize the live quantizer from its content-addressed config.
  const quantizer = createQuantizer(scaleQuantizerConfig);

  // Add quantizer to compositor under the name "scale"
  compositor.add('scale', quantizer);

  // Create the VideoRenderer
  const renderer = VideoRenderer.make({ fps: FPS, width: WIDTH, height: HEIGHT, durationMs: Millis(DURATION_MS) }, compositor);

  // Drive the quantizer through the progress range (0-100) across frames
  // so each frame evaluates the boundary at the correct progress value
  const frames: VideoFrameOutput[] = [];
  for await (const frame of renderer.frames()) {
    // Map frame progress (0..1) -> boundary input range (0..100)
    const progressValue = frame.progress * 100;
    quantizer.evaluate(progressValue);

    // Recompute compositor state after quantizer evaluation
    const state = compositor.compute();
    frames.push({
      frame: frame.frame,
      timestamp: frame.timestamp,
      progress: frame.progress,
      state,
    });
  }

  return frames;
}
