import { createWorld } from '@liteship/core/ecs';
import {
  BeatPart,
  IntensityPart,
  SyncAnchorPart,
  SyncSystem,
  admitScenePartSeed,
  scenePartSeed,
} from '@liteship/scene';
import { describe, expect, it } from 'vitest';
import { spawnSceneEntity } from '../../../support/scene-world.js';

const beat = (world: ReturnType<typeof createWorld>, timeMs: number): void => {
  spawnSceneEntity(world, { Beat: { _tag: 'beat', timeMs, strength: 1 } });
};

const intensity = (world: ReturnType<typeof createWorld>): number => {
  const entity = world.query(SyncAnchorPart, IntensityPart)[0];
  if (entity === undefined) throw new Error('expected SyncSystem output');
  return entity.get(IntensityPart);
};

describe('SyncSystem (typed Part path)', () => {
  it('pulses intensity to one on the frame of a beat', () => {
    const world = createWorld();
    spawnSceneEntity(world, { SyncAnchor: { anchor: 'bed', mode: 'beat' }, TargetEntity: 'hero' });
    beat(world, 0);
    beat(world, 500);
    beat(world, 1000);
    world.addSystem(SyncSystem(30, 60));
    world.tick();
    expect(intensity(world)).toBeCloseTo(1, 2);
  });

  it('emits lower intensity mid-beat with exponential decay', () => {
    const world = createWorld();
    spawnSceneEntity(world, { SyncAnchor: { anchor: 'bed', mode: 'beat' }, TargetEntity: 'hero' });
    beat(world, 0);
    beat(world, 1000);
    world.addSystem(SyncSystem(30, 60));
    world.tick();
    expect(intensity(world)).toBeLessThan(0.5);
  });

  it('writes zero before the first beat', () => {
    const world = createWorld();
    spawnSceneEntity(world, { SyncAnchor: { anchor: 'bed', mode: 'beat' } });
    beat(world, 5000);
    world.addSystem(SyncSystem(30, 60));
    world.tick();
    expect(intensity(world)).toBe(0);
  });

  it('multiplies beat decay by an in-range pulse envelope', () => {
    const world = createWorld();
    spawnSceneEntity(world, {
      SyncAnchor: { anchor: 'bed', mode: 'beat' },
      Envelope: { curve: 'pulse', periodFrames: 30, amplitude: 0.5 },
      FrameRange: { from: 0, to: 60 },
    });
    beat(world, 500);
    world.addSystem(SyncSystem(30, 60));
    world.tick();
    expect(intensity(world)).toBeCloseTo(1.5, 5);
  });

  it('gates beat decay through a fade envelope', () => {
    const world = createWorld();
    spawnSceneEntity(world, {
      SyncAnchor: { anchor: 'bed', mode: 'beat' },
      Envelope: { curve: 'linear-in', spanFrames: 60 },
      FrameRange: { from: 0, to: 60 },
    });
    beat(world, 0);
    beat(world, 1000);
    world.addSystem(SyncSystem(30, 60));
    world.tick();
    expect(intensity(world)).toBeCloseTo(Math.exp(-2) * 0.5, 5);
  });

  it('falls back to plain decay when an Envelope lacks FrameRange', () => {
    const world = createWorld();
    spawnSceneEntity(world, {
      SyncAnchor: { anchor: 'bed', mode: 'beat' },
      Envelope: { curve: 'pulse', periodFrames: 30, amplitude: 0.5 },
    });
    beat(world, 500);
    world.addSystem(SyncSystem(30, 60));
    world.tick();
    expect(intensity(world)).toBeCloseTo(1, 5);
  });

  const intensityAtFrame30 = (range: { from: number; to: number }): number => {
    const world = createWorld();
    spawnSceneEntity(world, {
      SyncAnchor: { anchor: 'bed', mode: 'beat' },
      Envelope: { curve: 'pulse', periodFrames: 30, amplitude: 0.5 },
      FrameRange: range,
    });
    beat(world, 500);
    world.addSystem(SyncSystem(30, 60));
    world.tick();
    return intensity(world);
  };

  it.each([
    [{ from: 40, to: 60 }, 1],
    [{ from: 0, to: 20 }, 1],
    [{ from: 30, to: 60 }, 1.5],
    [{ from: 0, to: 30 }, 1],
  ] as const)('honors the half-open envelope range %o', (range, expected) => {
    expect(intensityAtFrame30(range)).toBeCloseTo(expected, 5);
  });

  it('rejects malformed Beat values at admission instead of silently skipping them', () => {
    expect(() =>
      admitScenePartSeed(scenePartSeed(BeatPart, { _tag: 'beat', timeMs: 'oops', strength: 1 } as never)),
    ).toThrow(/failed admission/);
  });
});
