/**
 * Cross-layer model laws for typed ECS, Scene motion, and host frame adapters.
 *
 * This suite deliberately composes boundaries that the focused owner tests
 * prove separately: admission -> multi-entity ECS scheduling -> Scene motion
 * projection, plus FrameSchedule -> Stage/Remotion adapters. The reference is
 * intentionally boring data and the shared `sampleProgram` kernel.
 */

import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { Compositor, Millis, createFrameSchedule, createVideoRenderer } from '@liteship/core';
import {
  admitPart,
  createDenseStore,
  createWorld,
  defineDenseSystem,
  definePart,
  defineSystem,
} from '@liteship/core/ecs';
import { TypedValueSchema, sampleProgram, type RuntimeWritePlan } from '@liteship/core/motion';
import { StateName, schema } from '@liteship/core/schema';
import { precomputeFrames, rendererFromRemotionConfig, sampleMotionFrame } from '@liteship/remotion';
import {
  FrameRangePart,
  MotionSamplePart,
  RuntimeWritePlanPart,
  TrackIdPart,
  admitScenePartSeed,
  scenePartSeed,
} from '@liteship/scene';
import { MotionSampleSystem, sampleSceneMotion, sceneMotionTime } from '../../packages/scene/src/systems/motion.js';
import { sampleMotionFrames } from '@liteship/stage';
import type { AdmittedPartValue, EntityId, Part } from '@liteship/core/ecs';

const ObservedMotionPart = definePart('proof-observed-motion', schema.record(TypedValueSchema));
const SparsePositionPart = definePart('proof-sparse-position', schema.number);
const DensePositionPart = definePart('proof-dense-position', schema.number);

function mustAdmit<P extends Part>(part: P, candidate: unknown): AdmittedPartValue<P> {
  const result = admitPart(part, candidate);
  if (!result.ok) throw new Error(result.error.map((issue) => issue.message).join('; '));
  return result.value;
}

interface MotionFixture {
  readonly fromFrame: number;
  readonly span: number;
  readonly fromValue: number;
  readonly toValue: number;
}

function motionPlan(cssVar: string, fixture: MotionFixture): RuntimeWritePlan {
  return {
    properties: [
      {
        cssVar,
        from: { k: 'number', v: fixture.fromValue },
        to: { k: 'number', v: fixture.toValue },
      },
    ],
    durationMs: fixture.span,
    routing: 'seq',
    fromState: StateName('model-from'),
    toState: StateName('model-to'),
    easing: { kind: 'linear' },
  };
}

const motionFixtureArbitrary = fc.record({
  fromFrame: fc.integer({ min: -20, max: 20 }),
  span: fc.integer({ min: 1, max: 40 }),
  fromValue: fc.integer({ min: -10_000, max: 10_000 }),
  toValue: fc.integer({ min: -10_000, max: 10_000 }),
});

describe('typed ECS -> Scene motion model', () => {
  test('arbitrary multi-entity schedules preserve admission ownership, isolation, and same-tick system order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(motionFixtureArbitrary, { minLength: 1, maxLength: 8 }),
        fc.array(fc.integer({ min: -30, max: 80 }), { minLength: 1, maxLength: 24 }),
        async (fixtures, frames) => {
          const world = createWorld();
          let currentFrame = 0;
          const expected = new Map<
            string,
            { readonly range: { from: number; to: number }; readonly plan: RuntimeWritePlan }
          >();

          try {
            fixtures.forEach((fixture, index) => {
              const trackId = `model-track-${index}`;
              const cssVar = `--model-track-${index}`;
              const source = motionPlan(cssVar, fixture);
              const pristine = motionPlan(cssVar, fixture);
              const range = { from: fixture.fromFrame, to: fixture.fromFrame + fixture.span };
              world.spawn(
                admitScenePartSeed(scenePartSeed(TrackIdPart, trackId)),
                admitScenePartSeed(scenePartSeed(FrameRangePart, range)),
                admitScenePartSeed(scenePartSeed(RuntimeWritePlanPart, source)),
              );
              expected.set(trackId, { range, plan: pristine });

              // The author retains this object. Admission, not caller
              // discipline, must isolate the live entity from later mutation.
              (source.properties[0]!.to as { v: number }).v += 1_000_000;
            });

            world.addSystem(MotionSampleSystem(() => currentFrame));
            world.addSystem(
              defineSystem({
                name: 'observe-motion-after-sampling',
                query: [MotionSamplePart],
                reads: [],
                writes: [ObservedMotionPart],
                execute(entities, context) {
                  for (const entity of entities) {
                    context.write(entity, ObservedMotionPart, context.read(entity, MotionSamplePart));
                  }
                },
              }),
            );

            for (const frame of frames) {
              currentFrame = frame;
              world.tick();
              const entities = world.query(TrackIdPart, RuntimeWritePlanPart, MotionSamplePart, ObservedMotionPart);
              expect(entities).toHaveLength(fixtures.length);

              for (const entity of entities) {
                const trackId = entity.get(TrackIdPart);
                const model = expected.get(trackId)!;
                const expectedSample = sampleSceneMotion(model.plan, sceneMotionTime(frame, model.range));
                const retainedPlan = entity.get(RuntimeWritePlanPart);
                expect(retainedPlan).toEqual(model.plan);
                expect(Object.isFrozen(retainedPlan)).toBe(true);
                expect(Object.isFrozen(retainedPlan.properties)).toBe(true);
                expect(entity.get(MotionSamplePart)).toEqual(expectedSample);
                // The downstream system was registered after the sampler, so
                // it must observe this frame's write rather than the prior tick.
                expect(entity.get(ObservedMotionPart)).toEqual(expectedSample);
                expect(Object.keys(expectedSample)).toEqual([`--model-track-${trackId.slice('model-track-'.length)}`]);
              }
            }
          } finally {
            await world.dispose();
          }
        },
      ),
      { seed: 0xec5_5ce1, numRuns: 80 },
    );
  });

  test('an admitted plan cannot be laundered through a structural or JSON clone', () => {
    const admitted = mustAdmit(
      RuntimeWritePlanPart,
      motionPlan('--admission', {
        fromFrame: 0,
        span: 10,
        fromValue: 0,
        toValue: 1,
      }),
    );
    const structuralClone = { part: admitted.part, value: admitted.value };
    const jsonClone = JSON.parse(JSON.stringify(admitted)) as unknown;

    expect(() => createWorld().spawn(structuralClone as never)).toThrow(/not minted by admitPart/u);
    expect(() => createWorld().spawn(jsonClone as never)).toThrow(/not minted by admitPart/u);
  });
});

describe('sparse and dense ECS execution bisimulation', () => {
  test('the two storage paths preserve one recurrence over arbitrary populations and tick schedules', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: -100_000, max: 100_000 }), { minLength: 1, maxLength: 24 }),
        fc.array(fc.integer({ min: -1_000, max: 1_000 }), { minLength: 1, maxLength: 32 }),
        async (initial, deltas) => {
          const world = createWorld();
          const dense = createDenseStore(DensePositionPart, initial.length);
          const ids: EntityId[] = [];
          let delta = 0;
          try {
            world.addDenseStore(dense);
            for (const value of initial) {
              const id = world.spawn(mustAdmit(SparsePositionPart, value));
              ids.push(id);
              dense.writer.set(id, value);
            }
            world.addSystem(
              defineSystem({
                name: 'sparse-position-step',
                query: [SparsePositionPart],
                reads: [],
                writes: [SparsePositionPart],
                execute(entities, context) {
                  for (const entity of entities) {
                    context.write(entity, SparsePositionPart, context.read(entity, SparsePositionPart) + delta);
                  }
                },
              }),
            );
            world.addSystem(
              defineDenseSystem({
                name: 'dense-position-step',
                reads: [DensePositionPart],
                writes: [DensePositionPart],
                execute(context) {
                  const values = context.write(DensePositionPart).view();
                  for (let index = 0; index < values.length; index++) values[index] = values[index]! + delta;
                },
              }),
            );

            for (const nextDelta of deltas) {
              delta = nextDelta;
              world.tick();
              const sparse = new Map(
                world.query(SparsePositionPart).map((entity) => [entity.id, entity.get(SparsePositionPart)]),
              );
              expect(sparse.size).toBe(ids.length);
              for (const id of ids) expect(dense.store.get(id)).toBe(sparse.get(id));
            }
          } finally {
            await world.dispose();
          }
        },
      ),
      { seed: 0xec5_d3e5, numRuns: 100 },
    );
  });
});

describe('FrameSchedule and motion host differential laws', () => {
  test('Core, VideoRenderer, Stage, Remotion, and Scene share every frame coordinate and sampled value', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 120 }),
        fc.integer({ min: 1, max: 120 }),
        fc.integer({ min: -1_000, max: 1_000 }),
        fc.integer({ min: -1_000, max: 1_000 }),
        async (fps, totalFrames, fromValue, toValue) => {
          const compositor = Compositor.create();
          const plan = motionPlan('--host-parity', {
            fromFrame: 0,
            span: totalFrames,
            fromValue,
            toValue,
          });
          try {
            const renderer = rendererFromRemotionConfig(
              { fps, width: 1, height: 1, durationInFrames: totalFrames },
              compositor,
            );
            const coordinates = [...renderer.schedule];
            const rendered = await precomputeFrames(renderer);
            const stage = sampleMotionFrames(plan, totalFrames);

            expect(renderer.schedule.totalFrames).toBe(totalFrames);
            expect(rendered.map(({ frame, timestamp, progress }) => ({ frame, timestamp, progress }))).toEqual(
              coordinates,
            );
            for (const coordinate of coordinates) {
              const reference = new Map(
                sampleProgram(plan, coordinate.progress).map((leaf) => [leaf.cssVar, leaf.value]),
              );
              expect(stage[coordinate.frame]!.t).toBe(coordinate.progress);
              expect(stage[coordinate.frame]!.values).toEqual(reference);
              expect(sampleMotionFrame(plan, coordinate.frame, totalFrames)).toEqual(reference);
              expect(sampleSceneMotion(plan, coordinate.progress)).toEqual(Object.fromEntries(reference));
            }
          } finally {
            await compositor.dispose();
          }
        },
      ),
      { seed: 0xf4a_5ced, numRuns: 80 },
    );
  });

  test('finite inputs cannot create a non-finite or unsafe frame domain', () => {
    expect(() => createFrameSchedule({ fps: Number.MAX_VALUE, durationMs: Millis(Number.MAX_VALUE) })).toThrow(
      /safe.*frame|frame.*safe|finite.*frame/iu,
    );

    const schedule = createFrameSchedule({ fps: 29.97, durationMs: Millis(10_000) });
    expect(Number.isSafeInteger(schedule.totalFrames)).toBe(true);
    for (const coordinate of schedule) {
      expect(Number.isFinite(coordinate.timestamp)).toBe(true);
      expect(coordinate.progress).toBeGreaterThanOrEqual(0);
      expect(coordinate.progress).toBeLessThanOrEqual(1);
      expect(schedule.at(coordinate.frame)).toEqual(coordinate);
    }
  });

  test('schedule and renderer coordinates are isolated from retained caller mutation', async () => {
    const scheduleInput = { fps: 10, durationMs: Millis(1_000) };
    const schedule = createFrameSchedule(scheduleInput);
    scheduleInput.fps = 1;
    expect(schedule.fps).toBe(10);
    expect(schedule.at(1).timestamp).toBe(100);

    const compositor = Compositor.create();
    const rendererInput = { fps: 10, width: 2, height: 3, durationMs: Millis(1_000) };
    const renderer = createVideoRenderer(rendererInput, compositor);
    rendererInput.fps = 1;
    rendererInput.width = 99;
    rendererInput.durationMs = Millis(9_000);
    try {
      expect(renderer.config).toEqual({ fps: 10, width: 2, height: 3, durationMs: 1_000 });
      expect(Object.isFrozen(renderer.config)).toBe(true);
      expect(renderer.totalFrames).toBe(10);
      expect((await precomputeFrames(renderer)).map((frame) => frame.timestamp)).toEqual(
        [...renderer.schedule].map((frame) => frame.timestamp),
      );
    } finally {
      await compositor.dispose();
    }
  });
});
