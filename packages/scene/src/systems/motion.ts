/**
 * MotionSampleSystem — the `@czap/scene` MOTION ADAPTER for authored motion.
 *
 * This is ADDITIVE to (never a merge with) {@link TransitionSystem}. The two model
 * DIFFERENT concepts:
 *   - `TransitionSystem` computes a video-CROSSFADE `_blend` factor between two
 *     `Between` entities (a compositor mix). Untouched by W10.
 *   - `MotionSampleSystem` samples an AUTHORED motion program — the ONE shared kernel
 *     `sampleProgram` (`@czap/core`, Law 4) — at the entity's current frame and writes
 *     each typed leaf value as a scene component. This is the SAME reader the browser
 *     runtime floor, the stage/remotion video legs, and the worker off-thread sampler
 *     call; the differential oracle proves they all agree.
 *
 * A frame index maps to normalized program time `t = frameIndex / max(1, totalFrames-1)`,
 * exactly as the video export legs sample their `FrameRange`, so a scene rendered offline
 * and a browser scrubbing the floor render one identical curve.
 *
 * @module
 */

import { Effect } from 'effect';
import { sampleProgram, type RuntimeWritePlan, type System, type TypedValue, type World } from '@czap/core';

/** The component name a `MotionSampleSystem` writes each sampled leaf under (`motion:<cssVar>`). */
export function motionComponentName(cssVar: string): string {
  return `motion:${cssVar}`;
}

/**
 * Sample the shared motion kernel at normalized time `t`, projected to the scene's
 * component representation: a `cssVar → TypedValue` map, exactly the leaves a
 * {@link MotionSampleSystem} writes. Pure — the differential oracle reads THIS to prove
 * the scene leg equals the `sampleProgram` reference within epsilon.
 */
export function sampleSceneMotion(plan: RuntimeWritePlan, t: number): ReadonlyMap<string, TypedValue> {
  return new Map(sampleProgram(plan, t).map((s) => [s.cssVar, s.value]));
}

/** Map a frame index onto the program's normalized `[0,1]` timeline (endpoint-inclusive). */
function frameToT(frameIndex: number, totalFrames: number): number {
  const denom = Math.max(1, totalFrames - 1);
  const raw = frameIndex / denom;
  return raw < 0 ? 0 : raw > 1 ? 1 : raw;
}

/**
 * Build a `MotionSampleSystem` keyed to a frame index. It queries entities carrying a
 * `MotionProgram` marker component and, per tick, samples {@link sampleSceneMotion} at
 * the frame's normalized `t`, writing each leaf as a `motion:<cssVar>` component (via the
 * same `world.setComponent` seam `TransitionSystem` uses for `_blend`). It NEVER reads or
 * writes `_blend` — the two systems coexist on the same world.
 */
export function MotionSampleSystem(plan: RuntimeWritePlan, frameIndex: number, totalFrames: number): System {
  const t = frameToT(frameIndex, totalFrames);
  const sampled = sampleSceneMotion(plan, t);
  return {
    name: 'MotionSampleSystem',
    query: ['MotionProgram'],
    execute: (entities, world?: World.Shape) =>
      Effect.gen(function* () {
        for (const e of entities) {
          for (const [cssVar, value] of sampled) {
            const name = motionComponentName(cssVar);
            (e as unknown as Record<string, unknown>)[name] = value;
            if (world !== undefined) {
              yield* world.setComponent(e.id, name, value);
            }
          }
        }
      }),
  };
}
