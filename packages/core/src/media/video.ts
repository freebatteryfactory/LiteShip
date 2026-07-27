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
import { ValidationError } from '@liteship/error';
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

/** One deterministic coordinate in an offline frame schedule. */
export interface ScheduledFrame {
  readonly frame: number;
  readonly timestamp: number;
  readonly progress: number;
}

/**
 * Host-neutral frame timing. Rendering and encoding remain host-owned; this
 * kernel owns only the frame-count/index/time/progress law they must share.
 */
export interface FrameSchedule extends Iterable<ScheduledFrame> {
  readonly fps: number;
  readonly durationMs: Millis;
  readonly totalFrames: number;
  at(frame: number): ScheduledFrame;
}

interface VideoRendererShape {
  readonly config: VideoConfig;
  readonly schedule: FrameSchedule;
  readonly totalFrames: number;
  readonly scheduler: Scheduler.FixedStep;
  frames(): AsyncGenerator<VideoFrameOutput>;
}

/** Create the shared deterministic frame schedule for one duration and fps. */
export function createFrameSchedule(config: Pick<VideoConfig, 'fps' | 'durationMs'>): FrameSchedule {
  if (!Number.isFinite(config.fps) || config.fps <= 0) {
    throw ValidationError('createFrameSchedule', `expected fps > 0; received ${String(config.fps)}.`);
  }
  if (!Number.isFinite(config.durationMs) || config.durationMs < 0) {
    throw ValidationError(
      'createFrameSchedule',
      `expected a finite durationMs >= 0; received ${String(config.durationMs)}.`,
    );
  }
  // Capture primitive inputs once. Reading the caller-owned object from `at`
  // would let a later mutation change coordinates while the schedule's public
  // fps/duration fields kept describing the original timeline.
  const fps = config.fps;
  const durationMs = config.durationMs;
  const totalFrames = Math.ceil((durationMs / 1000) * fps);
  if (!Number.isSafeInteger(totalFrames)) {
    throw ValidationError(
      'createFrameSchedule',
      `expected a finite safe frame count; received ${String(totalFrames)} from fps=${String(fps)} and durationMs=${String(durationMs)}.`,
    );
  }
  const at = (frame: number): ScheduledFrame => {
    if (!Number.isInteger(frame) || frame < 0 || frame >= totalFrames) {
      throw ValidationError(
        'FrameSchedule.at',
        `expected an integer in [0, ${Math.max(0, totalFrames - 1)}]; received ${String(frame)}.`,
      );
    }
    return Object.freeze({
      frame,
      // Divide before multiplying so a valid finite duration cannot overflow
      // through the avoidable `frame * 1000` intermediate.
      timestamp: (frame / fps) * 1000,
      progress: frameToT(frame, totalFrames),
    });
  };
  const schedule: FrameSchedule = {
    fps,
    durationMs,
    totalFrames,
    at,
    *[Symbol.iterator](): Iterator<ScheduledFrame> {
      for (let frame = 0; frame < totalFrames; frame++) yield at(frame);
    },
  };
  return Object.freeze(schedule);
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
export function createVideoRenderer(
  config: VideoConfig,
  compositor: Compositor,
  signal?: Signal.Controllable<number>,
): VideoRendererShape {
  // The renderer is an addressed execution plan, not a live view over a
  // caller-owned options bag. Snapshot its scalar configuration before any
  // host adapter retains it so capture metadata and frame coordinates cannot
  // diverge after construction.
  const ownedConfig: VideoConfig = Object.freeze({
    fps: config.fps,
    width: config.width,
    height: config.height,
    durationMs: config.durationMs,
  });
  const schedule = createFrameSchedule(ownedConfig);
  const scheduler = SchedulerImpl.fixedStep(ownedConfig.fps);

  return {
    config: ownedConfig,
    schedule,
    totalFrames: schedule.totalFrames,
    scheduler,
    async *frames(): AsyncGenerator<VideoFrameOutput> {
      for (const coordinate of schedule) {
        scheduler.step();
        if (signal) {
          // Signal.seek is plain (synchronous) as of the Wave 6 reactive
          // convergence — call it directly, no Effect grounding. (The broader
          // video.ts effect-residue cleanup is the Wave 8 consumer tail; this one
          // line moves now because the Signal type change requires it for a green
          // tree — the §7d producer→consumer discipline.)
          signal.seek(coordinate.timestamp);
        }
        // Compositor.compute() is synchronous as of the core-seams wave (SEAM:2):
        // it returns the CompositeState directly, no Effect wrapper to run.
        const state = compositor.compute();
        yield {
          ...coordinate,
          state,
        };
      }
    },
  };
}

/** Public structural type for `VideoRenderer`. */
export type VideoRenderer = VideoRendererShape;
