import { describe, expect, it } from 'vitest';
import { createWorld } from '@liteship/core/ecs';
import { StateName } from '@liteship/core/schema';
import { sampleProgram, type RuntimeWritePlan } from '@liteship/core/motion';
import {
  FrameRangePart,
  MotionSamplePart,
  RuntimeWritePlanPart,
  TrackIdPart,
} from '../../../../packages/scene/src/parts.js';
import { admitScenePartSeed, scenePartSeed } from '../../../../packages/scene/src/parts.js';
import {
  MotionSampleSystem,
  sampleSceneMotion,
  sceneMotionTime,
} from '../../../../packages/scene/src/systems/motion.js';

function plan(cssVar: string, from: number, to: number): RuntimeWritePlan {
  return {
    properties: [{ cssVar, from: { k: 'number', v: from }, to: { k: 'number', v: to } }],
    durationMs: 1000,
    routing: 'seq',
    fromState: StateName('from'),
    toState: StateName('to'),
    easing: { kind: 'linear' },
  };
}

function admitted(part: Parameters<typeof scenePartSeed>[0], value: unknown) {
  return admitScenePartSeed(scenePartSeed(part, value));
}

describe('MotionSampleSystem', () => {
  it('samples each entity-owned plan and range without cross-entity bleed', async () => {
    const world = createWorld();
    try {
      world.spawn(
        admitted(TrackIdPart, 'left'),
        admitted(FrameRangePart, { from: 0, to: 5 }),
        admitted(RuntimeWritePlanPart, plan('--left', 0, 10)),
      );
      world.spawn(
        admitted(TrackIdPart, 'right'),
        admitted(FrameRangePart, { from: 2, to: 7 }),
        admitted(RuntimeWritePlanPart, plan('--right', 100, 200)),
      );
      world.addSystem(MotionSampleSystem(3));
      world.tick();

      const samples = world.query(TrackIdPart, MotionSamplePart);
      const byTrack = new Map(samples.map((entity) => [entity.get(TrackIdPart), entity.get(MotionSamplePart)]));
      expect(byTrack.get('left')).toEqual(sampleSceneMotion(plan('--left', 0, 10), sceneMotionTime(3, { from: 0, to: 5 })));
      expect(byTrack.get('right')).toEqual(
        sampleSceneMotion(plan('--right', 100, 200), sceneMotionTime(3, { from: 2, to: 7 })),
      );
      expect(byTrack.get('left')).not.toHaveProperty('--right');
      expect(byTrack.get('right')).not.toHaveProperty('--left');
    } finally {
      await world.dispose();
    }
  });

  it('maps the first and final rendered frames to the exact kernel endpoints', () => {
    const runtime = plan('--x', -3, 9);
    const range = { from: 10, to: 14 };
    expect(sceneMotionTime(10, range)).toBe(0);
    expect(sceneMotionTime(13, range)).toBe(1);
    expect(sampleSceneMotion(runtime, sceneMotionTime(10, range))).toEqual(
      Object.fromEntries(sampleProgram(runtime, 0).map((leaf) => [leaf.cssVar, leaf.value])),
    );
    expect(sampleSceneMotion(runtime, sceneMotionTime(13, range))).toEqual(
      Object.fromEntries(sampleProgram(runtime, 1).map((leaf) => [leaf.cssVar, leaf.value])),
    );
  });

  it('does not emit MotionSample for an entity without RuntimeWritePlan', async () => {
    const world = createWorld();
    try {
      world.spawn(admitted(TrackIdPart, 'plain'), admitted(FrameRangePart, { from: 0, to: 2 }));
      world.addSystem(MotionSampleSystem(0));
      world.tick();
      expect(world.query(MotionSamplePart)).toHaveLength(0);
    } finally {
      await world.dispose();
    }
  });
});
