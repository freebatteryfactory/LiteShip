/**
 * Typed ECS admission, authority, and hot-path laws.
 *
 * These controls pin the defect class that the former string-keyed ECS could
 * not express: a consumer/query without a real, schema-owned producer.
 */

import { describe, expect, test } from 'vitest';
import { hasTag } from '@liteship/error';
import { contentAddressOf, createComposable, ComposableWorld, schema } from '@liteship/core';
import {
  admitPart,
  createDenseStore,
  createWorld,
  defineDenseSystem,
  definePart,
  defineSystem,
} from '@liteship/core/ecs';
import type { AdmittedPartValue, Part, SystemContext } from '@liteship/core/ecs';

function mustAdmit<P extends Part>(part: P, candidate: unknown): AdmittedPartValue<P> {
  const result = admitPart(part, candidate);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.map((issue) => issue.message).join('; '));
  return result.value;
}

describe('typed ECS Part admission', () => {
  test('requires a minted Part, exact names, and a real kernel Schema', () => {
    expect(() => definePart(' padded ', schema.number)).toThrow();
    expect(() => definePart('forged-schema', { ast: { kind: 'number' } } as never)).toThrow();

    const forged = { name: 'forged', schema: schema.number, retention: 'snapshot' } as never;
    expect(() => createWorld().query(forged)).toThrow();
  });

  test('strictly decodes and snapshots admitted definition values', () => {
    const Config = definePart(
      'config',
      schema.struct({ count: schema.number, nested: schema.struct({ enabled: schema.boolean }) }),
    );
    const source = { count: 1, nested: { enabled: true } };
    const admitted = mustAdmit(Config, source);
    source.count = 9;
    source.nested.enabled = false;

    const world = createWorld();
    world.spawn(admitted);
    const retained = world.query(Config)[0]!.get(Config);

    expect(retained).toEqual({ count: 1, nested: { enabled: true } });
    expect(Object.isFrozen(retained)).toBe(true);
    expect(Object.isFrozen(retained.nested)).toBe(true);
    expect(admitPart(Config, { count: '1', nested: { enabled: true } }).ok).toBe(false);
  });

  test('retains a host reference only when its Part says so explicitly', () => {
    class HostHandle {
      value = 1;
    }
    const Handle = definePart('host-handle', schema.unknown, { retention: 'reference' });
    const handle = new HostHandle();
    const admitted = mustAdmit(Handle, handle);
    expect(admitted.value).toBe(handle);
  });

  test('rejects forged and cross-Part admission envelopes', () => {
    const Width = definePart('width', schema.number);
    const Height = definePart('height', schema.number);
    const width = mustAdmit(Width, 10);
    const forged = { ...width, part: Height };

    expect(() => createWorld().spawn(forged as never)).toThrow();
  });

  test('preserves the legacy canonical object fingerprint and key-order independence', () => {
    const A = definePart('a', schema.number);
    const B = definePart('b', schema.number);
    const first = createWorld().spawn(mustAdmit(B, 2), mustAdmit(A, 1));
    const second = createWorld().spawn(mustAdmit(A, 1), mustAdmit(B, 2));
    const expected = contentAddressOf({ a: 1, b: 2 });

    expect(first.slice(first.indexOf(':') + 1)).toBe(expected);
    expect(second.slice(second.indexOf(':') + 1)).toBe(expected);
  });
});

describe('typed ECS system authority', () => {
  test('makes the historical free-string MotionProgram orphan impossible to spell', () => {
    if (false) {
      defineSystem({
        name: 'historical-motion-program-orphan',
        // @ts-expect-error Canonical Part identities, never free strings, define ECS queries.
        query: ['MotionProgram'],
        reads: [],
        writes: [],
        execute() {},
      });
    }
    expect(true).toBe(true);
  });

  test('preserves within-tick read-current and registration order', () => {
    const Marker = definePart('marker', schema.boolean);
    const Computed = definePart('computed', schema.number);
    const world = createWorld();
    world.spawn(mustAdmit(Marker, true));
    let observed: number | undefined;

    world.addSystem(
      defineSystem({
        name: 'writer',
        query: [Marker],
        reads: [],
        writes: [Computed],
        execute(entities, context) {
          for (const entity of entities) context.write(entity, Computed, 42);
        },
      }),
    );
    world.addSystem(
      defineSystem({
        name: 'reader',
        query: [Computed],
        reads: [],
        writes: [],
        execute(entities, context) {
          observed = entities[0] === undefined ? undefined : context.read(entities[0], Computed);
        },
      }),
    );

    world.tick();
    expect(observed).toBe(42);
  });

  test('runs empty matches and defers mid-tick registration to the next tick', () => {
    const Missing = definePart('missing', schema.boolean);
    const world = createWorld();
    const runs: string[] = [];
    let installed = false;
    const late = defineSystem({
      name: 'late',
      query: [Missing],
      reads: [],
      writes: [],
      execute() {
        runs.push('late');
      },
    });
    world.addSystem(
      defineSystem({
        name: 'installer',
        query: [Missing],
        reads: [],
        writes: [],
        execute(entities) {
          expect(entities).toEqual([]);
          runs.push('installer');
          if (!installed) {
            installed = true;
            world.addSystem(late);
          }
        },
      }),
    );

    world.tick();
    expect(runs).toEqual(['installer']);
    world.tick();
    expect(runs).toEqual(['installer', 'installer', 'late']);
  });

  test('blocks undeclared reads/writes at runtime even after a type escape', () => {
    const Visible = definePart('visible', schema.number);
    const Secret = definePart('secret', schema.number);
    const world = createWorld();
    world.spawn(mustAdmit(Visible, 1), mustAdmit(Secret, 2));
    let caughtRead = false;
    let caughtWrite = false;

    world.addSystem(
      defineSystem({
        name: 'constrained',
        query: [Visible],
        reads: [],
        writes: [],
        execute(entities, context) {
          const escaped = context as SystemContext;
          try {
            escaped.optional(entities[0]!, Secret);
          } catch (error) {
            caughtRead = hasTag(error, 'InvariantViolationError');
          }
          try {
            escaped.write(entities[0]!, Secret, 3);
          } catch (error) {
            caughtWrite = hasTag(error, 'InvariantViolationError');
          }
        },
      }),
    );

    world.tick();
    expect(caughtRead).toBe(true);
    expect(caughtWrite).toBe(true);
  });

  test('allows declared secondary queries and blocks undeclared ones', () => {
    const Anchor = definePart('anchor', schema.boolean);
    const Related = definePart('related', schema.number);
    const Foreign = definePart('foreign', schema.number);
    const world = createWorld();
    world.spawn(mustAdmit(Anchor, true));
    world.spawn(mustAdmit(Related, 2));
    let relatedCount = -1;
    let blocked = false;

    world.addSystem(
      defineSystem({
        name: 'secondary-query',
        query: [Anchor],
        reads: [Related],
        writes: [],
        execute(_entities, context) {
          relatedCount = context.query(Related).length;
          try {
            (context as SystemContext).query(Foreign);
          } catch (error) {
            blocked = hasTag(error, 'InvariantViolationError');
          }
        },
      }),
    );

    world.tick();
    expect(relatedCount).toBe(1);
    expect(blocked).toBe(true);
  });

  test('rejects duplicate and redundant Part declarations', () => {
    const Value = definePart('value', schema.number);
    expect(() =>
      defineSystem({ name: 'duplicate', query: [Value, Value], reads: [], writes: [], execute() {} }),
    ).toThrow();
    expect(() =>
      defineSystem({ name: 'redundant', query: [Value], reads: [Value], writes: [], execute() {} }),
    ).toThrow();
  });
});

describe('typed ECS dense stores', () => {
  test('separates the read view from the mutable owner capability', () => {
    const Velocity = definePart('velocity', schema.number);
    const owned = createDenseStore(Velocity, 4);
    const id = createWorld().spawn();
    owned.writer.set(id, 12);

    const values = owned.store.view();
    expect(values.length).toBe(1);
    expect(values.at(0)).toBe(12);
    expect(values.at(-1)).toBe(12);
    expect(Array.from(values)).toEqual([12]);
    expect('set' in values).toBe(false);
    expect(owned.store.get(id)).toBe(12);

    if (false) {
      // @ts-expect-error a public dense read view has no mutable typed-array methods.
      values.set([99]);
    }
  });

  test('refuses a structurally forged dense owner pair', () => {
    const Value = definePart('forged-dense-owner', schema.number);
    const owned = createDenseStore(Value, 2);
    const world = createWorld();
    expect(() => world.addDenseStore({ store: owned.store, writer: owned.writer } as never)).toThrow();
  });

  test('dense systems receive only declared read/write capabilities', () => {
    const Position = definePart('position', schema.number);
    const Velocity = definePart('velocity-dense', schema.number);
    const position = createDenseStore(Position, 4);
    const velocity = createDenseStore(Velocity, 4);
    const world = createWorld();
    world.addDenseStore(position);
    world.addDenseStore(velocity);
    const id = world.spawn();
    position.writer.set(id, 10);
    velocity.writer.set(id, 2);

    world.addSystem(
      defineDenseSystem({
        name: 'integrate',
        reads: [Velocity],
        writes: [Position],
        execute(context) {
          const source = context.read(Velocity);
          const target = context.write(Position);
          for (const entityId of source.entities()) {
            target.set(entityId, position.store.get(entityId)! + source.get(entityId)!);
          }
        },
      }),
    );

    world.tick();
    expect(position.store.get(id)).toBe(12);
    world.despawn(id);
    expect(position.store.has(id)).toBe(false);
    expect(velocity.store.has(id)).toBe(false);
  });
});

describe('ComposableWorld admission alignment', () => {
  test('addresses, retains, and queries the same owned snapshot', () => {
    const world = createWorld();
    const composable = ComposableWorld.make<{ config: { count: number } }>(world);
    const source = { config: { count: 1 } };
    const entity = composable.spawn(source);
    source.config.count = 9;

    const queried = composable.query('config')[0]!;
    expect(entity.components.config.count).toBe(1);
    expect(queried.components.config.count).toBe(1);
    expect(entity.id).toBe(createComposable({ config: { count: 1 } }).id);
    expect(Object.isFrozen(entity.components.config)).toBe(true);
  });
});
