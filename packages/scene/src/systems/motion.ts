/**
 * Scene motion projection over the one core sampling kernel.
 *
 * Every selected entity owns its own admitted RuntimeWritePlan and FrameRange.
 * The system samples that plan at the entity-local frame and writes one
 * aggregate MotionSample Part. There are no dynamic `motion:<cssVar>` component
 * identities and no closure-global plan that can bleed between entities.
 *
 * @module
 */

import { frameToT, sampleProgram, type RuntimeWritePlan } from '@liteship/core/motion';
import { defineSystem, type System } from '@liteship/core/ecs';
import {
  FrameRangePart,
  MotionSamplePart,
  RuntimeWritePlanPart,
  type FrameRange,
  type MotionSample,
} from '../parts.js';

type FrameSource = number | (() => number);
const readFrame = (source: FrameSource): number => (typeof source === 'function' ? source() : source);

/** Map a Scene frame to normalized entity-local motion time. */
export function sceneMotionTime(frameIndex: number, range: FrameRange): number {
  const firstFrame = Math.ceil(range.from);
  const endFrameExclusive = Math.ceil(range.to);
  const totalFrames = Math.max(1, endFrameExclusive - firstFrame);
  return frameToT(frameIndex - firstFrame, totalFrames);
}

/** Pure aggregate projection of one RuntimeWritePlan sample. */
export function sampleSceneMotion(plan: RuntimeWritePlan, t: number): MotionSample {
  const sample: Record<string, MotionSample[string]> = {};
  for (const leaf of sampleProgram(plan, t)) sample[leaf.cssVar] = leaf.value;
  return Object.freeze(sample);
}

/**
 * Build the typed motion system for a fixed frame or a live frame source.
 * Runtime registration supplies a function so the same system instance reads
 * the current frame each tick; focused tests may pass a number directly.
 */
export function MotionSampleSystem(frameIndex: FrameSource): System {
  return defineSystem({
    name: 'MotionSampleSystem',
    query: [RuntimeWritePlanPart, FrameRangePart],
    reads: [],
    writes: [MotionSamplePart],
    execute: (entities, context) => {
      const frame = readFrame(frameIndex);
      for (const entity of entities) {
        const plan = context.read(entity, RuntimeWritePlanPart);
        const range = context.read(entity, FrameRangePart);
        context.write(entity, MotionSamplePart, sampleSceneMotion(plan, sceneMotionTime(frame, range)));
      }
    },
  });
}
