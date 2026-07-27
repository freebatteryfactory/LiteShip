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

import { clamp01 } from '@liteship/core';
import { defineSystem, type System } from '@liteship/core/ecs';
import type { EaseTag } from '../sugar/ease.js';
import { easeFnFor } from '../sugar/ease.js';
import { BetweenPart, BlendPart, EasePart, FrameRangePart, TransitionKindPart } from '../parts.js';

type FrameSource = number | (() => number);
const readFrame = (source: FrameSource): number => (typeof source === 'function' ? source() : source);

/** Build a TransitionSystem keyed to a frame index. */
export function TransitionSystem(frameIndex: FrameSource): System {
  return defineSystem({
    name: 'TransitionSystem',
    query: [TransitionKindPart, FrameRangePart, BetweenPart],
    reads: [EasePart],
    writes: [BlendPart],
    execute: (entities, context) => {
      const frame = readFrame(frameIndex);
      for (const e of entities) {
        const range = context.read(e, FrameRangePart);
        const span = Math.max(1, range.to - range.from);
        const local = clamp01((frame - range.from) / span);
        const easeTag = context.optional(e, EasePart) as EaseTag | undefined;
        const blend = easeTag !== undefined ? easeFnFor(easeTag)(local) : local;
        context.write(e, BlendPart, blend);
      }
    },
  });
}
