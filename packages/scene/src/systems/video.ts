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

import type { System, World } from '@liteship/core';
import type { ResolvedEnvelope } from '../sugar/envelope.js';
import { envelopeFactor } from '../sugar/envelope.js';

/** Build a VideoSystem keyed to a specific frame index. */
export function VideoSystem(frameIndex: number): System {
  return {
    name: 'VideoSystem',
    query: ['VideoSource', 'FrameRange'],
    execute: (entities, world?: World) => {
      for (const e of entities) {
        const range = e.components.get('FrameRange') as { from: number; to: number };
        const inRange = frameIndex >= range.from && frameIndex < range.to;
        const env = e.components.get('Envelope') as ResolvedEnvelope | undefined;
        const factor = env !== undefined ? envelopeFactor(env, frameIndex, range) : 1;
        const opacity = inRange ? factor : 0;
        (e as unknown as { _opacity: number })._opacity = opacity;
        if (world !== undefined) {
          world.setComponent(e.id, '_opacity', opacity);
        }
      }
    },
  };
}
