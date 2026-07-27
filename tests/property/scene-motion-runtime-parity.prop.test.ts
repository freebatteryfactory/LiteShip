import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { createWorld } from '@liteship/core/ecs';
import { StateName } from '@liteship/core/schema';
import { sampleProgram, type RuntimeWritePlan } from '@liteship/core/motion';
import {
  FrameRangePart,
  MotionSamplePart,
  RuntimeWritePlanPart,
  admitScenePartSeed,
  scenePartSeed,
} from '../../packages/scene/src/parts.js';
import { MotionSampleSystem, sceneMotionTime } from '../../packages/scene/src/systems/motion.js';
import { SceneRuntime, Track, TrackIdPart, compileScene } from '@liteship/scene';

describe('Scene motion runtime differential law', () => {
  it('actual ECS output equals the shared sampleProgram kernel across ranges and numeric endpoints', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: -20, max: 20 }),
        fc.integer({ min: 1, max: 30 }),
        fc.integer({ min: -100, max: 100 }),
        fc.integer({ min: -100, max: 100 }),
        fc.integer({ min: -10, max: 40 }),
        async (fromFrame, span, fromValue, toValue, offset) => {
          const range = { from: fromFrame, to: fromFrame + span };
          const frame = fromFrame + offset;
          const plan: RuntimeWritePlan = {
            properties: [{ cssVar: '--x', from: { k: 'number', v: fromValue }, to: { k: 'number', v: toValue } }],
            durationMs: span,
            routing: 'seq',
            fromState: StateName('a'),
            toState: StateName('b'),
            easing: { kind: 'linear' },
          };
          const world = createWorld();
          try {
            world.spawn(
              admitScenePartSeed(scenePartSeed(FrameRangePart, range)),
              admitScenePartSeed(scenePartSeed(RuntimeWritePlanPart, plan)),
            );
            world.addSystem(MotionSampleSystem(frame));
            world.tick();
            const actual = world.query(MotionSamplePart)[0]!.get(MotionSamplePart);
            const expected = Object.fromEntries(
              sampleProgram(plan, sceneMotionTime(frame, range)).map((leaf) => [leaf.cssVar, leaf.value]),
            );
            expect(actual).toEqual(expected);
          } finally {
            await world.dispose();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('the authored Track.video path preserves the same differential law through compile and admission', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 20 }),
        fc.integer({ min: -50, max: 50 }),
        fc.integer({ min: -50, max: 50 }),
        fc.integer({ min: 0, max: 19 }),
        async (span, fromValue, toValue, requestedFrame) => {
          const frame = Math.min(requestedFrame, span - 1);
          const plan: RuntimeWritePlan = {
            properties: [{ cssVar: '--track', from: { k: 'number', v: fromValue }, to: { k: 'number', v: toValue } }],
            durationMs: span,
            routing: 'seq',
            fromState: StateName('a'),
            toState: StateName('b'),
            easing: { kind: 'linear' },
          };
          const handle = await SceneRuntime.build(
            compileScene({
              name: 'property-motion',
              fps: 1000,
              bpm: 120,
              tracks: [Track.video('subject', { from: 0, to: span, source: null, motion: plan })],
            }),
          );
          try {
            await handle.tick(frame);
            const entity = handle.world.query(TrackIdPart, MotionSamplePart)[0]!;
            expect(entity.get(TrackIdPart)).toBe('subject');
            expect(entity.get(MotionSamplePart)).toEqual(
              Object.fromEntries(
                sampleProgram(plan, sceneMotionTime(frame, { from: 0, to: span })).map((leaf) => [
                  leaf.cssVar,
                  leaf.value,
                ]),
              ),
            );
          } finally {
            await handle.release();
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});
