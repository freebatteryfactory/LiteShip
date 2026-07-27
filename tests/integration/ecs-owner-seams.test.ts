/** Integration proof that the ECS split has one implementation per public operation. */

import { describe, expect, it } from 'vitest';
import { schema } from '@liteship/core';
import * as Ecs from '@liteship/core/ecs';
import { createDenseStore, defineDenseSystem } from '../../packages/core/src/ecs/dense.js';
import { EntityId, admitPart, definePart } from '../../packages/core/src/ecs/part.js';
import { createWorld, defineSystem } from '../../packages/core/src/ecs/world.js';

describe('ECS semantic-owner seams', () => {
  it('projects the exact owner implementations through the public facade', () => {
    expect(Ecs.EntityId).toBe(EntityId);
    expect(Ecs.admitPart).toBe(admitPart);
    expect(Ecs.definePart).toBe(definePart);
    expect(Ecs.createDenseStore).toBe(createDenseStore);
    expect(Ecs.defineDenseSystem).toBe(defineDenseSystem);
    expect(Ecs.createWorld).toBe(createWorld);
    expect(Ecs.defineSystem).toBe(defineSystem);
    expect(Object.keys(Ecs).sort()).toEqual([
      'EntityId',
      'admitPart',
      'createDenseStore',
      'createWorld',
      'defineDenseSystem',
      'definePart',
      'defineSystem',
    ]);
  });

  it('shares minted Part, admission, dense-store, and system witnesses across owners', () => {
    const Position = definePart('owner-seam-position', schema.number);
    const Velocity = definePart('owner-seam-velocity', schema.number);
    const admitted = admitPart(Position, 10);
    expect(admitted.ok).toBe(true);
    if (!admitted.ok) throw new Error('planted numeric admission failed');

    const world = createWorld();
    const id = world.spawn(admitted.value);
    const position = createDenseStore(Position, 1);
    const velocity = createDenseStore(Velocity, 1);
    world.addDenseStore(position);
    world.addDenseStore(velocity);
    position.writer.set(id, 10);
    velocity.writer.set(id, 2);

    world.addSystem(
      defineDenseSystem({
        name: 'owner-seam-integrate',
        reads: [Velocity],
        writes: [Position],
        execute(context) {
          for (const entityId of context.read(Velocity).entities()) {
            context
              .write(Position)
              .set(entityId, context.read(Velocity).get(entityId)! + position.store.get(entityId)!);
          }
        },
      }),
    );
    world.tick();

    expect(world.query(Position)[0]!.get(Position)).toBe(10);
    expect(position.store.get(id)).toBe(12);
  });
});
