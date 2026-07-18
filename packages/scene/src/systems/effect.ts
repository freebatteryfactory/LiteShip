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

import { clamp01, type System, type World } from '@czap/core';
import type { ResolvedEnvelope } from '../sugar/envelope.js';
import { envelopeFactor } from '../sugar/envelope.js';

/** Build an EffectSystem keyed to a frame index. */
export function EffectSystem(frameIndex: number): System {
  return {
    name: 'EffectSystem',
    query: ['EffectKind', 'FrameRange'],
    execute: (entities, world?: World.Shape) => {
      for (const e of entities) {
        const range = e.components.get('FrameRange') as { from: number; to: number };
        const inRange = frameIndex >= range.from && frameIndex < range.to;
        if (!inRange) {
          (e as unknown as { _intensity: number })._intensity = 0;
          if (world !== undefined) {
            world.setComponent(e.id, '_intensity', 0);
          }
          continue;
        }
        const span = Math.max(1, range.to - range.from);
        const local = clamp01((frameIndex - range.from) / span);
        const env = e.components.get('Envelope') as ResolvedEnvelope | undefined;
        const intensity = env !== undefined ? local * envelopeFactor(env, frameIndex, range) : local;
        (e as unknown as { _intensity: number })._intensity = intensity;
        if (world !== undefined) {
          world.setComponent(e.id, '_intensity', intensity);
        }
      }
    },
  };
}
