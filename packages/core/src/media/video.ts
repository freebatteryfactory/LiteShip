/**
 * VideoRenderer -- fixed-step frame generator for deterministic video rendering.
 *
 * Same compositor, same state pipeline -- different clock. The VideoRenderer
 * drives a FixedStepScheduler at target fps, producing VideoFrameOutput
 * per frame with the full CompositeState snapshot.
 *
 * @module
 */

import type { Scheduler } from '../reactive/scheduler.js';
import { Scheduler as SchedulerImpl } from '../reactive/scheduler.js';
import type { CompositeState, Compositor } from './compositor.js';
import type { Signal } from '../reactive/signal.js';
import type { Millis } from '../schema/brands.js';
import { frameToT } from '../motion/transition-program.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Configuration for a {@link VideoRenderer}: resolution, target fps, and total duration. */
export interface VideoConfig {
  readonly fps: number;
  readonly width: number;
  readonly height: number;
  readonly durationMs: Millis;
}

/**
 * Single frame yielded by `VideoRenderer.frames()`: frame index, timestamp,
 * normalized progress, and the {@link CompositeState} snapshot captured at that tick.
 */
export interface VideoFrameOutput {
  readonly frame: number;
  readonly timestamp: number;
  readonly progress: number;
  readonly state: CompositeState;
}

interface VideoRendererShape {
  readonly config: VideoConfig;
  readonly totalFrames: number;
  readonly scheduler: Scheduler.FixedStep;
  frames(): AsyncGenerator<VideoFrameOutput>;
}

// ---------------------------------------------------------------------------
// CompositeState → RGBA — the ONE deterministic frame painter both backends use
// ---------------------------------------------------------------------------

/** FNV-1a offset basis / prime — the canonical 32-bit content-mix constants. */
const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/**
 * Paint one {@link CompositeState} into a solid `width*height*4` RGBA buffer
 * whose color is a DETERMINISTIC function of the frame's discrete state + css
 * outputs.
 *
 * This is the SINGLE source of truth for "frame state → pixels" shared by BOTH
 * headless byte-encoders — the `@liteship/command` ffmpeg render backend that the
 * shipping `scene render` CLI drives, and the `@liteship/stage` ffmpeg `FrameEncoder`.
 * Neither owns its own painter, so
 * the same `CompositeState` always yields byte-identical pixels regardless of
 * which path encoded it. It is HONEST, not a black stub: distinct frames (the
 * graph's poses crossing states over the timeline) yield distinct pixels, so the
 * encoded video genuinely VARIES with the graph state; re-encoding the same
 * frames yields byte-identical RGBA, so it is content-addressable and replayable.
 *
 * The mix is a small FNV-1a over the canonical-ish (key, value) pairs of the
 * state's `discrete` map and its compiled `css` outputs — the two fields that
 * carry the per-frame pose. (A richer renderer can paint geometry later; the
 * `(state, w, h) → RGBA` seam shape is unchanged, so both backends move
 * together.)
 *
 * @param state - the per-frame compositor snapshot (the real pose at this tick).
 * @param width - frame width in pixels.
 * @param height - frame height in pixels.
 * @returns a `width*height*4` RGBA byte buffer (alpha fully opaque).
 */
export function compositeStateToRgba(state: CompositeState, width: number, height: number): Uint8Array {
  let hash = FNV_OFFSET;
  const mix = (s: string): void => {
    for (let i = 0; i < s.length; i++) {
      hash ^= s.charCodeAt(i);
      hash = Math.imul(hash, FNV_PRIME) >>> 0;
    }
  };
  // Sort keys so the painted color is independent of object-insertion order —
  // a true content function of the state, not of how the map was built.
  for (const k of Object.keys(state.discrete).sort()) {
    mix(k);
    mix(String(state.discrete[k]));
  }
  for (const k of Object.keys(state.outputs.css).sort()) {
    mix(k);
    mix(String(state.outputs.css[k]));
  }
  const r = hash & 0xff;
  const g = (hash >>> 8) & 0xff;
  const b = (hash >>> 16) & 0xff;

  const bytes = new Uint8Array(width * height * 4);
  for (let i = 0; i < bytes.length; i += 4) {
    bytes[i] = r;
    bytes[i + 1] = g;
    bytes[i + 2] = b;
    bytes[i + 3] = 255;
  }
  return bytes;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a video renderer that produces deterministic frames from a Compositor.
 *
 * Each call to `frames()` returns an async generator yielding one
 * `VideoFrameOutput` per frame at the configured fps/duration.
 *
 * When a `signal` is provided it is seeked to each frame's timestamp before
 * the compositor evaluates, so quantizers that read from that signal advance
 * deterministically with the render clock.
 */
function _make(config: VideoConfig, compositor: Compositor, signal?: Signal.Controllable<number>): VideoRendererShape {
  const totalFrames = Math.ceil((config.durationMs / 1000) * config.fps);
  const scheduler = SchedulerImpl.fixedStep(config.fps);

  return {
    config,
    totalFrames,
    scheduler,
    async *frames(): AsyncGenerator<VideoFrameOutput> {
      for (let i = 0; i < totalFrames; i++) {
        scheduler.step();
        const timestamp = (i * 1000) / config.fps;
        if (signal) {
          // Signal.seek is plain (synchronous) as of the Wave 6 reactive
          // convergence — call it directly, no Effect grounding. (The broader
          // video.ts effect-residue cleanup is the Wave 8 consumer tail; this one
          // line moves now because the Signal type change requires it for a green
          // tree — the §7d producer→consumer discipline.)
          signal.seek(timestamp);
        }
        // Compositor.compute() is synchronous as of the core-seams wave (SEAM:2):
        // it returns the CompositeState directly, no Effect wrapper to run.
        const state = compositor.compute();
        yield {
          frame: i,
          timestamp,
          progress: totalFrames > 1 ? frameToT(i, totalFrames) : 1,
          state,
        };
      }
    },
  };
}

/**
 * VideoRenderer — fixed-step frame generator for deterministic offline rendering.
 * Drives a {@link Compositor} at the configured fps and optionally seeks a
 * controllable time {@link Signal} so every frame is reproducible.
 */
export const VideoRenderer = {
  /** Create a renderer bound to the given compositor and optional seekable time signal. */
  make: _make,
};

/** Public structural type for `VideoRenderer`. */
export type VideoRenderer = VideoRendererShape;
