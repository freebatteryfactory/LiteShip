/**
 * Stateful differential model for the typed ECS world.
 *
 * The unit laws prove individual admission and authority failures. This suite
 * composes the public operations in arbitrary order and compares the live
 * world after every step with a deliberately boring Map model. It guards the
 * defect class that isolated examples miss: spawn/set/remove/despawn/tick and
 * dense swap-remove interactions changing one another's observable meaning.
 */

import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { schema } from '@liteship/core';
import {
  admitPart,
  createDenseStore,
  createWorld,
  defineDenseSystem,
  definePart,
  defineSystem,
} from '@liteship/core/ecs';
import type { AdmittedPartValue, EntityId, Part, World } from '@liteship/core/ecs';

const Flag = definePart('simulation-flag', schema.boolean);
const Count = definePart('simulation-count', schema.number);
const Energy = definePart('simulation-energy', schema.number);

type EntityModel = {
  flag?: boolean;
  count?: number;
};

type Operation =
  | { readonly kind: 'spawn'; readonly flag: boolean | undefined; readonly count: number | undefined }
  | { readonly kind: 'set-flag'; readonly selector: number; readonly value: boolean }
  | { readonly kind: 'set-count'; readonly selector: number; readonly value: number }
  | { readonly kind: 'remove-flag'; readonly selector: number }
  | { readonly kind: 'remove-count'; readonly selector: number }
  | { readonly kind: 'despawn'; readonly selector: number }
  | { readonly kind: 'set-energy'; readonly selector: number; readonly value: number }
  | { readonly kind: 'delete-energy'; readonly selector: number }
  | { readonly kind: 'tick' };

const finiteInteger = fc.integer({ min: -1_000_000, max: 1_000_000 });
const operationArbitrary: fc.Arbitrary<Operation> = fc.oneof(
  fc.record({
    kind: fc.constant('spawn' as const),
    flag: fc.option(fc.boolean(), { nil: undefined }),
    count: fc.option(finiteInteger, { nil: undefined }),
  }),
  fc.record({ kind: fc.constant('set-flag' as const), selector: fc.nat(), value: fc.boolean() }),
  fc.record({ kind: fc.constant('set-count' as const), selector: fc.nat(), value: finiteInteger }),
  fc.record({ kind: fc.constant('remove-flag' as const), selector: fc.nat() }),
  fc.record({ kind: fc.constant('remove-count' as const), selector: fc.nat() }),
  fc.record({ kind: fc.constant('despawn' as const), selector: fc.nat() }),
  fc.record({ kind: fc.constant('set-energy' as const), selector: fc.nat(), value: finiteInteger }),
  fc.record({ kind: fc.constant('delete-energy' as const), selector: fc.nat() }),
  fc.constant({ kind: 'tick' as const }),
);

function mustAdmit<P extends Part>(part: P, candidate: unknown): AdmittedPartValue<P> {
  const result = admitPart(part, candidate);
  if (!result.ok) throw new Error(result.error.map((issue) => issue.message).join('; '));
  return result.value;
}

function select(ids: readonly EntityId[], selector: number): EntityId | undefined {
  return ids.length === 0 ? undefined : ids[selector % ids.length];
}

function sorted(values: Iterable<string>): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

interface Subject {
  readonly world: World & AsyncDisposable;
  readonly energy: ReturnType<typeof createDenseStore<typeof Energy>>;
  readonly ids: EntityId[];
  readonly entities: Map<EntityId, EntityModel>;
  readonly energyModel: Map<EntityId, number>;
}

function createSubject(): Subject {
  const world = createWorld();
  const energy = createDenseStore(Energy, 128);
  world.addDenseStore(energy);
  world.addSystem(
    defineSystem({
      name: 'simulation-increment-enabled',
      query: [Flag],
      reads: [Count],
      writes: [Count],
      execute(entities, context) {
        for (const entity of entities) {
          if (!context.read(entity, Flag)) continue;
          context.write(entity, Count, (context.optional(entity, Count) ?? 0) + 1);
        }
      },
    }),
  );
  world.addSystem(
    defineDenseSystem({
      name: 'simulation-decay-energy',
      reads: [Energy],
      writes: [Energy],
      execute(context) {
        const source = context.read(Energy);
        const destination = context.write(Energy);
        for (const id of source.entities()) destination.set(id, source.get(id)! - 0.5);
      },
    }),
  );
  return {
    world,
    energy,
    ids: [],
    entities: new Map(),
    energyModel: new Map(),
  };
}

function applyOperation(subject: Subject, operation: Operation): void {
  const id = 'selector' in operation ? select(subject.ids, operation.selector) : undefined;
  switch (operation.kind) {
    case 'spawn': {
      const values: AdmittedPartValue[] = [];
      if (operation.flag !== undefined) values.push(mustAdmit(Flag, operation.flag));
      if (operation.count !== undefined) values.push(mustAdmit(Count, operation.count));
      const spawned = subject.world.spawn(...values);
      subject.ids.push(spawned);
      subject.entities.set(spawned, {
        ...(operation.flag === undefined ? {} : { flag: operation.flag }),
        ...(operation.count === undefined ? {} : { count: operation.count }),
      });
      return;
    }
    case 'set-flag':
      if (id !== undefined) {
        subject.world.set(id, mustAdmit(Flag, operation.value));
        subject.entities.get(id)!.flag = operation.value;
      }
      return;
    case 'set-count':
      if (id !== undefined) {
        subject.world.set(id, mustAdmit(Count, operation.value));
        subject.entities.get(id)!.count = operation.value;
      }
      return;
    case 'remove-flag':
      if (id !== undefined) {
        subject.world.remove(id, Flag);
        delete subject.entities.get(id)!.flag;
      }
      return;
    case 'remove-count':
      if (id !== undefined) {
        subject.world.remove(id, Count);
        delete subject.entities.get(id)!.count;
      }
      return;
    case 'despawn':
      if (id !== undefined) {
        subject.world.despawn(id);
        subject.entities.delete(id);
        subject.energyModel.delete(id);
        subject.ids.splice(subject.ids.indexOf(id), 1);
      }
      return;
    case 'set-energy':
      if (id !== undefined) {
        subject.energy.writer.set(id, operation.value);
        subject.energyModel.set(id, operation.value);
      }
      return;
    case 'delete-energy':
      if (id !== undefined) {
        subject.energy.writer.delete(id);
        subject.energyModel.delete(id);
      }
      return;
    case 'tick':
      subject.world.tick();
      for (const model of subject.entities.values()) {
        if (model.flag === true) model.count = (model.count ?? 0) + 1;
      }
      for (const [entityId, value] of subject.energyModel) {
        subject.energyModel.set(entityId, value - 0.5);
      }
      return;
  }
}

function observableState(subject: Subject): unknown {
  const flags = subject.world.query(Flag).map((entity) => [entity.id, entity.get(Flag)] as const);
  const counts = subject.world.query(Count).map((entity) => [entity.id, entity.get(Count)] as const);
  const both = subject.world.query(Flag, Count).map((entity) => entity.id);
  const expectedFlags = [...subject.entities]
    .filter((entry): entry is [EntityId, EntityModel & { flag: boolean }] => entry[1].flag !== undefined)
    .map(([entityId, value]) => [entityId, value.flag] as const);
  const expectedCounts = [...subject.entities]
    .filter((entry): entry is [EntityId, EntityModel & { count: number }] => entry[1].count !== undefined)
    .map(([entityId, value]) => [entityId, value.count] as const);
  const expectedBoth = [...subject.entities]
    .filter(([, value]) => value.flag !== undefined && value.count !== undefined)
    .map(([entityId]) => entityId);

  expect(flags).toEqual(expectedFlags);
  expect(counts).toEqual(expectedCounts);
  expect(both).toEqual(expectedBoth);
  expect(sorted(subject.energy.store.entities())).toEqual(sorted(subject.energyModel.keys()));
  expect(subject.energy.store.count).toBe(subject.energyModel.size);
  for (const [entityId, value] of subject.energyModel) {
    expect(subject.energy.store.get(entityId)).toBe(value);
  }

  return {
    flags,
    counts,
    both,
    energy: [...subject.energyModel].sort(([left], [right]) => left.localeCompare(right)),
  };
}

describe('typed ECS state-machine simulation', () => {
  test('arbitrary operation traces match the reference model after every step and replay deterministically', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(operationArbitrary, { minLength: 1, maxLength: 100 }), async (operations) => {
        const first = createSubject();
        const replay = createSubject();
        try {
          for (const operation of operations) {
            applyOperation(first, operation);
            applyOperation(replay, operation);
            expect(observableState(first)).toEqual(observableState(replay));
          }
        } finally {
          await Promise.all([first.world[Symbol.asyncDispose](), replay.world[Symbol.asyncDispose]()]);
        }
      }),
      { numRuns: 80, seed: 0xec50_0001 },
    );
  });

  test('query views remain immutable snapshots after later admitted writes', () => {
    const subject = createSubject();
    const id = subject.world.spawn(mustAdmit(Count, 1));
    const before = subject.world.query(Count)[0]!;
    subject.world.set(id, mustAdmit(Count, 2));

    expect(before.get(Count)).toBe(1);
    expect(subject.world.query(Count)[0]!.get(Count)).toBe(2);
  });
});
