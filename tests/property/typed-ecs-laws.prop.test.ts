/** Property controls for typed ECS identity, admission, and dense storage. */

import { describe, test } from 'vitest';
import fc from 'fast-check';
import { schema } from '@liteship/core';
import { admitPart, createDenseStore, createWorld, definePart } from '../../packages/core/src/ecs/index.js';
import type { AdmittedPartValue, Part } from '../../packages/core/src/ecs/index.js';

function mustAdmit<P extends Part>(part: P, candidate: unknown): AdmittedPartValue<P> {
  const result = admitPart(part, candidate);
  if (!result.ok) throw new Error(result.error.map((issue) => issue.message).join('; '));
  return result.value;
}

describe('typed ECS properties', () => {
  test('Part order cannot change an entity content fingerprint', () => {
    const A = definePart('property-a', schema.number);
    const B = definePart('property-b', schema.string);
    fc.assert(
      fc.property(fc.integer(), fc.string(), fc.boolean(), (a, b, reverse) => {
        const admittedA = mustAdmit(A, a);
        const admittedB = mustAdmit(B, b);
        const id = reverse ? createWorld().spawn(admittedB, admittedA) : createWorld().spawn(admittedA, admittedB);
        const canonical = createWorld().spawn(admittedA, admittedB);
        return id.slice(id.indexOf(':') + 1) === canonical.slice(canonical.indexOf(':') + 1);
      }),
    );
  });

  test('post-admission source mutation never changes retained values', () => {
    const State = definePart(
      'property-state',
      schema.struct({ value: schema.number, nested: schema.struct({ label: schema.string }) }),
    );
    fc.assert(
      fc.property(fc.integer(), fc.string(), fc.integer(), (value, label, mutation) => {
        const source = { value, nested: { label } };
        const admitted = mustAdmit(State, source);
        source.value = mutation;
        source.nested.label = `${label}-mutated`;
        const world = createWorld();
        world.spawn(admitted);
        const retained = world.query(State)[0]!.get(State);
        return retained.value === value && retained.nested.label === label;
      }),
    );
  });

  test('dense swap-remove preserves every non-removed entity/value pair', () => {
    const Value = definePart('property-dense-value', schema.number);
    fc.assert(
      fc.property(fc.uniqueArray(fc.integer(), { minLength: 1, maxLength: 32 }), fc.nat(), (values, rawIndex) => {
        const owned = createDenseStore(Value, values.length);
        const ids = values.map((_value, index) => `property-entity-${index}` as never);
        values.forEach((value, index) => owned.writer.set(ids[index]!, value));
        const removedIndex = rawIndex % values.length;
        owned.writer.delete(ids[removedIndex]!);
        return values.every((value, index) =>
          index === removedIndex ? owned.store.get(ids[index]!) === undefined : owned.store.get(ids[index]!) === value,
        );
      }),
    );
  });

  test('despawn removes a member from every registered dense store', () => {
    const A = definePart('property-dense-a', schema.number);
    const B = definePart('property-dense-b', schema.number);
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        const world = createWorld();
        const left = createDenseStore(A, 1);
        const right = createDenseStore(B, 1);
        world.addDenseStore(left);
        world.addDenseStore(right);
        const id = world.spawn();
        left.writer.set(id, a);
        right.writer.set(id, b);
        world.despawn(id);
        return !left.store.has(id) && !right.store.has(id);
      }),
    );
  });
});
