import { describe, expect, it } from 'vitest';
import { StateName } from '@liteship/core/schema';
import { sampleProgram, type RuntimeWritePlan } from '@liteship/core/motion';
import {
  MotionSamplePart,
  RuntimeWritePlanPart,
  SceneRuntime,
  Track,
  TrackIdPart,
  compileScene,
} from '@liteship/scene';

function mutablePlan(): RuntimeWritePlan {
  return {
    properties: [
      { cssVar: '--liteship-opacity', from: { k: 'opacity', v: 0 }, to: { k: 'opacity', v: 1 } },
    ],
    durationMs: 900,
    routing: 'seq',
    fromState: StateName('hidden'),
    toState: StateName('visible'),
    easing: { kind: 'linear' },
  };
}

describe('Track.video → SceneRuntime motion path', () => {
  it('compiles a real plan seed, admits an owned snapshot, registers system eight, and samples endpoints', async () => {
    const sourcePlan = mutablePlan();
    const compiled = compileScene({
      name: 'motion-path',
      fps: 10,
      bpm: 120,
      tracks: [Track.video('hero', { from: 0, to: 10, source: { kind: 'canvas' }, motion: sourcePlan })],
    });
    const seed = compiled.trackSpawns[0]!.components.find((candidate) => candidate.part === RuntimeWritePlanPart.name);
    expect(seed?.value).toBe(sourcePlan);

    const handle = await SceneRuntime.build(compiled);
    try {
      expect(handle.systemsRegistered).toBe(8);

      // Admission owns a frozen snapshot. Mutating the authoring object after
      // build cannot poison the live entity or change its sampled output.
      (sourcePlan.properties[0]!.to as { v: number }).v = 999;

      await handle.tick(0);
      let entity = handle.world.query(TrackIdPart, RuntimeWritePlanPart, MotionSamplePart)[0]!;
      expect(Object.isFrozen(entity.get(RuntimeWritePlanPart))).toBe(true);
      expect(entity.get(MotionSamplePart)).toEqual(
        Object.fromEntries(sampleProgram(entity.get(RuntimeWritePlanPart), 0).map((leaf) => [leaf.cssVar, leaf.value])),
      );

      await handle.tick(900);
      entity = handle.world.query(TrackIdPart, RuntimeWritePlanPart, MotionSamplePart)[0]!;
      expect(entity.get(TrackIdPart)).toBe('hero');
      expect(entity.get(MotionSamplePart)['--liteship-opacity']).toEqual({ k: 'opacity', v: 1 });
    } finally {
      await handle.release();
    }
  });
});
