/**
 * AudioSystem — maps video frame index to audio sample phase for each
 * audio entity in range, and writes a `_gain` factor (1.0 baseline)
 * modulated by the entity's optional `Envelope` component (compiled
 * from a track's `envelope: fade.out(Beat(2))` declaration). Feeds the
 * receipt layer that downstream mixers (user-provided) consume — a
 * real mixer multiplies its linear gain by `_gain`; PassThroughMixer
 * intentionally forwards Volume verbatim.
 *
 * @module
 */

import { defineSystem, type System } from '@liteship/core/ecs';
import type { ResolvedEnvelope } from '../sugar/envelope.js';
import { envelopeFactor } from '../sugar/envelope.js';
import { AudioSourcePart, EnvelopePart, FrameRangePart, GainPart, PhasePart } from '../parts.js';

type FrameSource = number | (() => number);
const readFrame = (source: FrameSource): number => (typeof source === 'function' ? source() : source);

/** Build an AudioSystem keyed to frame index + fps + sample rate. */
export function AudioSystem(frameIndex: FrameSource, fps: number, sampleRate: number): System {
  const samplesPerFrame = sampleRate / fps;
  return defineSystem({
    name: 'AudioSystem',
    query: [AudioSourcePart, FrameRangePart],
    reads: [EnvelopePart],
    writes: [PhasePart, GainPart],
    execute: (entities, context) => {
      const frame = readFrame(frameIndex);
      for (const e of entities) {
        const range = context.read(e, FrameRangePart);
        const inRange = frame >= range.from && frame < range.to;
        const phase = inRange ? (frame - range.from) * samplesPerFrame : 0;
        const env = context.optional(e, EnvelopePart) as ResolvedEnvelope | undefined;
        const gain = inRange ? (env !== undefined ? envelopeFactor(env, frame, range) : 1) : 0;
        context.write(e, PhasePart, phase);
        context.write(e, GainPart, gain);
      }
    },
  });
}
