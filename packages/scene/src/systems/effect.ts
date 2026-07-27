/**
 * EffectSystem — computes normalized intensity [0,1] for each effect
 * entity whose FrameRange covers the current frame. When the entity
 * carries an `Envelope` component (compiled from a track's
 * `envelope: pulse.every(Beat(0.5), { amplitude: 0.3 })` declaration),
 * the linear ramp is multiplied by the envelope factor — pulses
 * overdrive past 1, fades gate the ramp. Real effect application lives
 * in compositor-side shaders; this system just decides "what fraction
 * of the effect is active right now".
 *
 * @module
 */

import { clamp01 } from '@liteship/core';
import { defineSystem, type System } from '@liteship/core/ecs';
import type { ResolvedEnvelope } from '../sugar/envelope.js';
import { envelopeFactor } from '../sugar/envelope.js';
import { EffectKindPart, EnvelopePart, FrameRangePart, IntensityPart } from '../parts.js';

type FrameSource = number | (() => number);
const readFrame = (source: FrameSource): number => (typeof source === 'function' ? source() : source);

/** Build an EffectSystem keyed to a frame index. */
export function EffectSystem(frameIndex: FrameSource): System {
  return defineSystem({
    name: 'EffectSystem',
    query: [EffectKindPart, FrameRangePart],
    reads: [EnvelopePart],
    writes: [IntensityPart],
    execute: (entities, context) => {
      const frame = readFrame(frameIndex);
      for (const e of entities) {
        const range = context.read(e, FrameRangePart);
        const inRange = frame >= range.from && frame < range.to;
        if (!inRange) {
          context.write(e, IntensityPart, 0);
          continue;
        }
        const span = Math.max(1, range.to - range.from);
        const local = clamp01((frame - range.from) / span);
        const env = context.optional(e, EnvelopePart) as ResolvedEnvelope | undefined;
        const intensity = env !== undefined ? local * envelopeFactor(env, frame, range) : local;
        context.write(e, IntensityPart, intensity);
      }
    },
  });
}
