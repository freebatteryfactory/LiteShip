/**
 * Dense ECS proof — public read-only storage, owner-only mutation, declared
 * system authority, mixed scheduling, cleanup, and stable entity identity.
 */

import { describe, expect, test } from 'vitest';
import { schema } from '@liteship/core';
import {
  admitPart,
  createDenseStore,
  createWorld,
  defineDenseSystem,
  definePart,
  defineSystem,
  EntityId,
  type AdmittedPartValue,
  type Part,
} from '@liteship/core/ecs';
import { hasTag } from '@liteship/error';

function mustAdmit<P extends Part>(part: P, candidate: unknown): AdmittedPartValue<P> {
  const result = admitPart(part, candidate);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.map((issue) => issue.message).join('; '));
  return result.value;
}

describe('createDenseStore — separated reader and owner capabilities', () => {
  test('owner writes round-trip through the immutable public store', () => {
    const Velocity = definePart('velocity', schema.number);
    const { store, writer } = createDenseStore(Velocity, 16);
    const id = EntityId('e-test-000001');

    writer.set(id, 42.5);

    expect(store.get(id)).toBe(42.5);
    expect(store.has(id)).toBe(true);
    expect(store.has(EntityId('missing'))).toBe(false);
    expect(store.name).toBe('velocity');
    expect(store.capacity).toBe(16);
  });

  test('owner overwrite preserves cardinality', () => {
    const Hp = definePart('hp', schema.number);
    const { store, writer } = createDenseStore(Hp, 8);
    const id = EntityId('e-overwrite');

    writer.set(id, 10);
    writer.set(id, 20);

    expect(store.get(id)).toBe(20);
    expect(store.count).toBe(1);
  });

  test('swap-delete preserves every surviving entity/value relation', () => {
    const Hp = definePart('swap-hp', schema.number);
    const { store, writer } = createDenseStore(Hp, 8);
    const a = EntityId('e-a');
    const b = EntityId('e-b');
    const c = EntityId('e-c');
    writer.set(a, 1);
    writer.set(b, 2);
    writer.set(c, 3);

    expect(writer.delete(b)).toBe(true);
    expect(writer.delete(EntityId('absent'))).toBe(false);
    expect(store.count).toBe(2);
    expect(store.get(a)).toBe(1);
    expect(store.get(b)).toBeUndefined();
    expect(store.get(c)).toBe(3);
    expect(new Set(store.entities())).toEqual(new Set([a, c]));
  });

  test('the public zero-copy view exposes no typed-array mutation surface', () => {
    const Speed = definePart('speed', schema.number);
    const { store, writer } = createDenseStore(Speed, 8);
    writer.set(EntityId('e-0'), 10);
    writer.set(EntityId('e-1'), 20);
    const view = store.view();

    expect(view).not.toBeInstanceOf(Float64Array);
    expect(Array.from(view)).toEqual([10, 20]);
    expect(view.at(0)).toBe(10);
    expect(view.at(-1)).toBe(20);
    expect(Object.isFrozen(view)).toBe(true);
    expect('set' in view).toBe(false);
  });

  test('the owner receives the allocation-free mutable view', () => {
    const Position = definePart('position', schema.number);
    const { store, writer } = createDenseStore(Position, 8);
    const id = EntityId('e-position');
    writer.set(id, 5);

    const values = writer.view();
    expect(values).toBeInstanceOf(Float64Array);
    values[0] = 9;
    expect(store.get(id)).toBe(9);
  });

  test('capacity failure remains a tagged validation error', () => {
    const Tiny = definePart('tiny', schema.number);
    const { writer } = createDenseStore(Tiny, 2);
    writer.set(EntityId('e-0'), 1);
    writer.set(EntityId('e-1'), 2);

    try {
      writer.set(EntityId('e-2'), 3);
      expect.unreachable('expected capacity failure');
    } catch (error) {
      expect(hasTag(error, 'ValidationError')).toBe(true);
    }
  });
});

describe('World.tick — declared dense authority', () => {
  test('a read-only dense system sees every live value', () => {
    const Velocity = definePart('tick-velocity', schema.number);
    const owned = createDenseStore(Velocity, 64);
    const world = createWorld();
    world.addDenseStore(owned);
    const ids = [world.spawn(), world.spawn(), world.spawn()];
    ids.forEach((id, index) => owned.writer.set(id, (index + 1) * 10));
    let sum = 0;

    world.addSystem(
      defineDenseSystem({
        name: 'accumulator',
        reads: [Velocity],
        writes: [],
        execute(context) {
          for (const value of context.read(Velocity).view()) sum += value;
        },
      }),
    );
    world.tick();

    expect(sum).toBe(60);
  });

  test('a declared dense writer mutates in place across ticks', () => {
    const Position = definePart('tick-position', schema.number);
    const owned = createDenseStore(Position, 64);
    const world = createWorld();
    world.addDenseStore(owned);
    const first = world.spawn();
    const second = world.spawn();
    owned.writer.set(first, 0);
    owned.writer.set(second, 100);

    world.addSystem(
      defineDenseSystem({
        name: 'mover',
        reads: [],
        writes: [Position],
        execute(context) {
          const values = context.write(Position).view();
          for (let index = 0; index < values.length; index++) values[index] = values[index]! + 5;
        },
      }),
    );

    world.tick();
    world.tick();
    expect(owned.store.get(first)).toBe(10);
    expect(owned.store.get(second)).toBe(110);
  });

  test('a dense system is skipped until every declared store exists', () => {
    const Missing = definePart('missing-dense', schema.number);
    const world = createWorld();
    let called = false;
    world.addSystem(
      defineDenseSystem({
        name: 'requires-missing',
        reads: [Missing],
        writes: [],
        execute() {
          called = true;
        },
      }),
    );

    world.tick();
    expect(called).toBe(false);
  });

  test('multiple stores preserve typed cross-store physics', () => {
    const Position = definePart('multi-position', schema.number);
    const Velocity = definePart('multi-velocity', schema.number);
    const position = createDenseStore(Position, 32);
    const velocity = createDenseStore(Velocity, 32);
    const world = createWorld();
    world.addDenseStore(position);
    world.addDenseStore(velocity);
    const first = world.spawn();
    const second = world.spawn();
    position.writer.set(first, 0);
    position.writer.set(second, 50);
    velocity.writer.set(first, 1);
    velocity.writer.set(second, -2);

    world.addSystem(
      defineDenseSystem({
        name: 'physics',
        reads: [Position, Velocity],
        writes: [Position],
        execute(context) {
          const velocities = context.read(Velocity);
          const currentPositions = context.read(Position);
          const positions = context.write(Position);
          for (const entity of velocities.entities()) {
            positions.set(entity, (currentPositions.get(entity) ?? 0) + (velocities.get(entity) ?? 0));
          }
        },
      }),
    );

    world.tick();
    expect(position.store.get(first)).toBe(1);
    expect(position.store.get(second)).toBe(48);
  });
});

describe('World — mixed scheduling and cleanup', () => {
  test('regular and dense systems execute in registration order in one tick', () => {
    const Label = definePart('label', schema.string);
    const Speed = definePart('mixed-speed', schema.number);
    const speed = createDenseStore(Speed, 32);
    const world = createWorld();
    world.addDenseStore(speed);
    const id = world.spawn(mustAdmit(Label, 'player'));
    speed.writer.set(id, 9.8);
    const observed: string[] = [];

    world.addSystem(
      defineSystem({
        name: 'labeler',
        query: [Label],
        reads: [],
        writes: [],
        execute(entities, context) {
          for (const entity of entities) observed.push(`label:${context.read(entity, Label)}`);
        },
      }),
    );
    world.addSystem(
      defineDenseSystem({
        name: 'speeder',
        reads: [Speed],
        writes: [],
        execute(context) {
          for (const value of context.read(Speed).view()) observed.push(`speed:${value}`);
        },
      }),
    );

    world.tick();
    expect(observed).toEqual(['label:player', 'speed:9.8']);
  });

  test('despawn removes the entity from every dense store', () => {
    const Hp = definePart('despawn-hp', schema.number);
    const hp = createDenseStore(Hp, 16);
    const world = createWorld();
    world.addDenseStore(hp);
    const id = world.spawn();
    hp.writer.set(id, 100);

    world.despawn(id);

    expect(hp.store.has(id)).toBe(false);
    expect(hp.store.count).toBe(0);
  });

  test('entity ids remain unique while identical admitted state keeps the same content suffix', () => {
    const Kind = definePart('kind', schema.string);
    const world = createWorld();
    const first = world.spawn(mustAdmit(Kind, 'bullet'));
    const second = world.spawn(mustAdmit(Kind, 'bullet'));

    expect(first).not.toBe(second);
    expect(first.slice(first.indexOf(':') + 1)).toBe(second.slice(second.indexOf(':') + 1));
  });
});
