/**
 * VideoSystem — clamps opacity=1 when the frame index lies within
 * each video entity's FrameRange, opacity=0 otherwise. When the entity
 * carries an `Envelope` component (compiled from a track's
 * `envelope: fade.in(Beat(1))` declaration), the in-range opacity is
 * multiplied by the envelope factor — so fades ramp 0→1 / 1→0 and
 * pulses overdrive past 1. Runs once per tick over the world's dense entity
 * query and writes the resulting opacity back through the shared ECS seam.
 *
 * @module
 */

import { defineSystem, type System } from '@liteship/core/ecs';
import type { ResolvedEnvelope } from '../sugar/envelope.js';
import { envelopeFactor } from '../sugar/envelope.js';
import { EnvelopePart, FrameRangePart, OpacityPart, VideoSourcePart } from '../parts.js';

type FrameSource = number | (() => number);
const readFrame = (source: FrameSource): number => (typeof source === 'function' ? source() : source);

/** Build a VideoSystem keyed to a specific frame index. */
export function VideoSystem(frameIndex: FrameSource): System {
  return defineSystem({
    name: 'VideoSystem',
    query: [VideoSourcePart, FrameRangePart],
    reads: [EnvelopePart],
    writes: [OpacityPart],
    execute: (entities, context) => {
      const frame = readFrame(frameIndex);
      for (const e of entities) {
        const range = context.read(e, FrameRangePart);
        const inRange = frame >= range.from && frame < range.to;
        const env = context.optional(e, EnvelopePart) as ResolvedEnvelope | undefined;
        const factor = env !== undefined ? envelopeFactor(env, frame, range) : 1;
        const opacity = inRange ? factor : 0;
        context.write(e, OpacityPart, opacity);
      }
    },
  });
}
