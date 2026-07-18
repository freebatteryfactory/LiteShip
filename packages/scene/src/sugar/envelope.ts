/**
 * Envelope helpers — typed automation curves that attach to component
 * values (opacity, volume gain, effect intensity). `compileScene`
 * resolves the beat spans to frame counts and emits an `Envelope`
 * component; VideoSystem / AudioSystem / EffectSystem read it at tick
 * time via {@link envelopeFactor}. Authors write them declaratively:
 * `Track.video('hero', { ..., envelope: fade.in(Beat(1)) })`.
 *
 * Canonical type declarations live in `@czap/_spine` (ADR-0010); this
 * module mirrors them and keeps the runtime constructors + evaluator.
 *
 * @module
 */

import { clamp01 } from '@czap/core';
import type {
  FadeEnvelope as _FadeEnvelope,
  PulseEnvelope as _PulseEnvelope,
  ResolvedEnvelope as _ResolvedEnvelope,
  TrackEnvelope as _TrackEnvelope,
} from '@czap/_spine';
import type { BeatHandle } from './beat.js';
import { resolveBeat } from './beat.js';

/** Fade envelope (linear over a beat span). Mirror of the `@czap/_spine` declaration. */
export type FadeEnvelope = _FadeEnvelope;

/** Pulse envelope (periodic, amplitude-scaled). Mirror of the `@czap/_spine` declaration. */
export type PulseEnvelope = _PulseEnvelope;

/** Track envelope union — what a track's optional `envelope` field accepts. */
export type TrackEnvelope = _TrackEnvelope;

/**
 * Compile-time-resolved envelope — the `Envelope` ECS component shape.
 * Beat spans are pre-resolved to frame counts so the per-tick read is
 * arithmetic-only (ADR-0002). Mirror of the `@czap/_spine` declaration.
 */
export type ResolvedEnvelope = _ResolvedEnvelope;

/** Fade constructors. */
export const fade = {
  /** Linear fade-in over the given span. */
  in: (span: BeatHandle): FadeEnvelope => ({ _tag: 'envelope', curve: 'linear-in', span }),
  /** Linear fade-out over the given span. */
  out: (span: BeatHandle): FadeEnvelope => ({ _tag: 'envelope', curve: 'linear-out', span }),
} as const;

/** Pulse constructors. */
export const pulse = {
  /** Periodic pulse with amplitude and period. */
  every: (period: BeatHandle, opts: { amplitude: number }): PulseEnvelope => ({
    _tag: 'envelope',
    curve: 'pulse',
    period,
    amplitude: opts.amplitude,
  }),
} as const;

/**
 * Resolve a declared envelope's beat spans to frame counts using the
 * scene's BPM + fps. Called once by `compileScene` per enveloped track;
 * the result is the `Envelope` component systems read every tick.
 */
export function resolveEnvelope(env: TrackEnvelope, ctx: { bpm: number; fps: number }): ResolvedEnvelope {
  if (env.curve === 'pulse') {
    return { curve: 'pulse', periodFrames: resolveBeat(env.period, ctx), amplitude: env.amplitude };
  }
  return { curve: env.curve, spanFrames: resolveBeat(env.span, ctx) };
}

/**
 * Evaluate a resolved envelope at a frame index within a track's
 * frame range, returning a multiplicative factor for the system's
 * written value:
 *
 * - `linear-in` — ramps 0 → 1 over the first `spanFrames` of the range, then holds 1.
 * - `linear-out` — holds 1 until the last `spanFrames` of the range, then ramps 1 → 0.
 * - `pulse` — peaks at `1 + amplitude` on each period boundary and
 *   decays linearly back to 1 over the period (beat-pulse feel; factors
 *   above 1 are deliberate overdrive, mirroring the PulseEnvelope contract).
 *
 * Out-of-range frames are the caller's concern — systems already gate
 * on FrameRange before applying the factor.
 */
export function envelopeFactor(env: ResolvedEnvelope, frameIndex: number, range: { from: number; to: number }): number {
  if (env.curve === 'pulse') {
    const period = Math.max(1e-9, env.periodFrames);
    const local = (((frameIndex - range.from) % period) + period) % period;
    return 1 + env.amplitude * (1 - local / period);
  }
  const span = Math.max(1e-9, env.spanFrames);
  if (env.curve === 'linear-in') {
    return clamp01((frameIndex - range.from) / span);
  }
  return clamp01((range.to - frameIndex) / span);
}
