/**
 * TransitionSystem — computes a normalized blend factor [0,1] across
 * each transition entity's FrameRange. When the entity carries an
 * `Ease` component (compiled from a track's `ease: 'cubic'` /
 * `ease: { stepped: 8 }` declaration), the linear progress is shaped
 * through the named easing from the closed catalog (`sugar/ease.ts`)
 * before being written. Downstream the compositor combines the two
 * `Between` entities using this factor.
 *
 * @module
 */

import { clamp01, type System, type World } from '@liteship/core';
import type { EaseTag } from '../sugar/ease.js';
import { easeFnFor } from '../sugar/ease.js';

/** Build a TransitionSystem keyed to a frame index. */
export function TransitionSystem(frameIndex: number): System {
  return {
    name: 'TransitionSystem',
    query: ['TransitionKind', 'FrameRange', 'Between'],
    execute: (entities, world?: World) => {
      for (const e of entities) {
        const range = e.components.get('FrameRange') as { from: number; to: number };
        const span = Math.max(1, range.to - range.from);
        const local = clamp01((frameIndex - range.from) / span);
        const easeTag = e.components.get('Ease') as EaseTag | undefined;
        const blend = easeTag !== undefined ? easeFnFor(easeTag)(local) : local;
        (e as unknown as { _blend: number })._blend = blend;
        if (world !== undefined) {
          world.setComponent(e.id, '_blend', blend);
        }
      }
    },
  };
}
