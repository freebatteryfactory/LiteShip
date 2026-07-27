import { describe, it, expect } from 'vitest';
import { createWorld } from '@liteship/core/ecs';
import { AudioSourcePart, AudioSystem, GainPart, PhasePart } from '@liteship/scene';
import { spawnSceneEntity } from '../../../support/scene-world.js';

describe('AudioSystem', () => {
  it('produces frame-sample mapping for audio entities in range', () => {
    const world = createWorld();
    spawnSceneEntity(world, {
      AudioSource: 'bed',
      FrameRange: { from: 0, to: 120 },
      Volume: -6,
      Pan: 0,
    });
    world.addSystem(AudioSystem(30, 60, 48000));
    world.tick();
    const entities = world.query(AudioSourcePart, PhasePart);
    expect(entities[0]!.get(PhasePart)).toBeCloseTo(30 * (48000 / 60), 0);
  });

  it('emits zero phase for out-of-range entities', () => {
    const world = createWorld();
    spawnSceneEntity(world, { AudioSource: 'bed', FrameRange: { from: 60, to: 120 }, Volume: 0, Pan: 0 });
    world.addSystem(AudioSystem(0, 60, 48000));
    world.tick();
    const entities = world.query(AudioSourcePart, PhasePart);
    expect(entities[0]!.get(PhasePart)).toBe(0);
  });

  it('writes _gain = 1 for in-range entities without an Envelope', () => {
    const world = createWorld();
    spawnSceneEntity(world, { AudioSource: 'bed', FrameRange: { from: 0, to: 120 }, Volume: -6, Pan: 0 });
    world.addSystem(AudioSystem(30, 60, 48000));
    world.tick();
    const entities = world.query(AudioSourcePart, GainPart);
    expect(entities[0]!.get(GainPart)).toBe(1);
  });

  it('modulates _gain by a linear-out Envelope component (fade ramps 1 -> 0 at range end)', () => {
    const gainAt = (frameIndex: number): number => {
      const world = createWorld();
      spawnSceneEntity(world, {
        AudioSource: 'bed',
        FrameRange: { from: 0, to: 120 },
        Volume: -6,
        Pan: 0,
        Envelope: { curve: 'linear-out', spanFrames: 60 },
      });
      world.addSystem(AudioSystem(frameIndex, 60, 48000));
      world.tick();
      const entities = world.query(AudioSourcePart, GainPart);
      return entities[0]!.get(GainPart);
    };
    expect(gainAt(0)).toBe(1);
    expect(gainAt(60)).toBe(1);
    expect(gainAt(90)).toBeCloseTo(0.5, 6);
    expect(gainAt(119)).toBeCloseTo(1 / 60, 6);
  });

  it('writes _gain = 0 for out-of-range entities', () => {
    const world = createWorld();
    spawnSceneEntity(world, {
      AudioSource: 'bed',
      FrameRange: { from: 60, to: 120 },
      Volume: 0,
      Pan: 0,
      Envelope: { curve: 'linear-out', spanFrames: 30 },
    });
    world.addSystem(AudioSystem(0, 60, 48000));
    world.tick();
    const entities = world.query(AudioSourcePart, GainPart);
    expect(entities[0]!.get(GainPart)).toBe(0);
  });
});
