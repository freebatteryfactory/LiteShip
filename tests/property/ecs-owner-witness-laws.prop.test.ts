/** Cross-owner witness laws for the split ECS implementation. */

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { schema } from '@liteship/core';
import * as Ecs from '@liteship/core/ecs';
import { createDenseStore, defineDenseSystem } from '../../packages/core/src/ecs/dense.js';
import { admitPart, definePart } from '../../packages/core/src/ecs/part.js';
import { createWorld, defineSystem } from '../../packages/core/src/ecs/world.js';

const safeName = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'), { minLength: 1, maxLength: 24 })
  .map((characters) => characters.join(''));

describe('ECS owner witness laws', () => {
  it('accepts a Part and admission across every owner/facade construction route', () => {
    fc.assert(
      fc.property(safeName, fc.integer(), fc.boolean(), (suffix, value, reverseRoute) => {
        const PartOwner = reverseRoute ? Ecs.definePart : definePart;
        const AdmissionOwner = reverseRoute ? admitPart : Ecs.admitPart;
        const WorldOwner = reverseRoute ? Ecs.createWorld : createWorld;
        const Value = PartOwner(`witness-value-${suffix}`, schema.number);
        const admitted = AdmissionOwner(Value, value);
        expect(admitted.ok).toBe(true);
        if (!admitted.ok) return;

        const world = WorldOwner();
        world.spawn(admitted.value);
        expect(world.query(Value)[0]!.get(Value)).toBe(value);
      }),
      { numRuns: 100 },
    );
  });

  it('rejects cloned admissions regardless of which world projection receives them', () => {
    fc.assert(
      fc.property(safeName, fc.integer(), fc.boolean(), (suffix, value, publicWorld) => {
        const Value = definePart(`witness-admission-${suffix}`, schema.number);
        const admitted = admitPart(Value, value);
        expect(admitted.ok).toBe(true);
        if (!admitted.ok) return;

        const clone = { ...admitted.value };
        const world = publicWorld ? Ecs.createWorld() : createWorld();
        expect(() => world.spawn(clone as never)).toThrow();
      }),
      { numRuns: 100 },
    );
  });

  it('accepts canonical dense owners and rejects cloned store/writer pairs', () => {
    fc.assert(
      fc.property(safeName, fc.integer({ min: 1, max: 32 }), fc.boolean(), (suffix, capacity, publicStore) => {
        const Value = definePart(`witness-dense-${suffix}`, schema.number);
        const owned = publicStore ? Ecs.createDenseStore(Value, capacity) : createDenseStore(Value, capacity);
        const world = createWorld();
        world.addDenseStore(owned);
        expect(() => createWorld().addDenseStore({ store: owned.store, writer: owned.writer } as never)).toThrow();
      }),
      { numRuns: 100 },
    );
  });

  it('shares regular and dense system witnesses but refuses structural clones', () => {
    fc.assert(
      fc.property(safeName, fc.boolean(), (suffix, dense) => {
        const Value = definePart(`witness-system-${suffix}`, schema.number);
        const world = createWorld();
        if (dense) {
          const owned = createDenseStore(Value, 1);
          world.addDenseStore(owned);
          const system = defineDenseSystem({
            name: `dense-${suffix}`,
            reads: [Value],
            writes: [],
            execute() {},
          });
          world.addSystem(system);
          expect(() => createWorld().addSystem({ ...system } as never)).toThrow();
        } else {
          const system = defineSystem({
            name: `regular-${suffix}`,
            query: [Value],
            reads: [],
            writes: [],
            execute() {},
          });
          world.addSystem(system);
          expect(() => createWorld().addSystem({ ...system } as never)).toThrow();
        }
      }),
      { numRuns: 100 },
    );
  });
});
