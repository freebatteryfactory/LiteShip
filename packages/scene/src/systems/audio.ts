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

import type { System, World } from '@czap/core';
import type { ResolvedEnvelope } from '../sugar/envelope.js';
import { envelopeFactor } from '../sugar/envelope.js';

/** Build an AudioSystem keyed to frame index + fps + sample rate. */
export function AudioSystem(frameIndex: number, fps: number, sampleRate: number): System {
  const samplesPerFrame = sampleRate / fps;
  return {
    name: 'AudioSystem',
    query: ['AudioSource', 'FrameRange'],
    execute: (entities, world?: World.Shape) => {
      for (const e of entities) {
        const range = e.components.get('FrameRange') as { from: number; to: number };
        const inRange = frameIndex >= range.from && frameIndex < range.to;
        const phase = inRange ? (frameIndex - range.from) * samplesPerFrame : 0;
        const env = e.components.get('Envelope') as ResolvedEnvelope | undefined;
        const gain = inRange ? (env !== undefined ? envelopeFactor(env, frameIndex, range) : 1) : 0;
        (e as unknown as { _phase: number })._phase = phase;
        (e as unknown as { _gain: number })._gain = gain;
        if (world !== undefined) {
          world.setComponent(e.id, '_phase', phase);
          world.setComponent(e.id, '_gain', gain);
        }
      }
    },
  };
}
