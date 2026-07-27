import { describe, it, expect } from 'vitest';
import { createWorld } from '@liteship/core/ecs';
import { PassThroughMixer } from '@liteship/scene';
import { spawnSceneEntity } from '../../../support/scene-world.js';

describe('PassThroughMixer', () => {
  it('emits a receipt entry per audio entity per tick', () => {
    const receipts: unknown[] = [];
    const world = createWorld();
    spawnSceneEntity(world, { AudioSource: 'bed', Volume: -6, Pan: 0.2 });
    world.addSystem(
      PassThroughMixer(30, (r) => {
        receipts.push(r);
      }),
    );
    world.tick();
    expect(receipts.length).toBe(1);
    expect(receipts[0]).toMatchObject({ frame: 30, volume: -6, pan: 0.2 });
  });

  it('forwards Volume/Pan verbatim without DSP', () => {
    let receipt: { volume: number; pan: number } | undefined;
    const world = createWorld();
    spawnSceneEntity(world, { AudioSource: 'x', Volume: -12, Pan: -1 });
    world.addSystem(
      PassThroughMixer(0, (r) => {
        receipt = r as { volume: number; pan: number };
      }),
    );
    world.tick();
    expect(receipt?.volume).toBe(-12);
    expect(receipt?.pan).toBe(-1);
  });
});
