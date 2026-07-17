/**
 * Dense component storage tests -- Float64Array-backed Part.dense()
 * and DenseSystem integration with World.tick().
 */

import { describe, test, expect } from 'vitest';
import { Part, World } from '@czap/core';
import { hasTag } from '@czap/error';
import type { EntityId, DenseStore } from '@czap/core';

// ---------------------------------------------------------------------------
// Part.dense -- standalone store operations
// ---------------------------------------------------------------------------

describe('Part.dense -- DenseStore', () => {
  test('set/get roundtrip', () => {
    const store = Part.dense('velocity', 16);
    const id = 'e-test-000001' as EntityId;

    store.set(id, 42.5);
    expect(store.get(id)).toBe(42.5);
  });

  test('has returns true for stored, false for missing', () => {
    const store = Part.dense('hp', 8);
    const a = 'e-test-aaa' as EntityId;
    const b = 'e-test-bbb' as EntityId;

    store.set(a, 100);
    expect(store.has(a)).toBe(true);
    expect(store.has(b)).toBe(false);
  });

  test('get returns undefined for missing entity', () => {
    const store = Part.dense('hp', 8);
    expect(store.get('e-test-nope' as EntityId)).toBeUndefined();
  });

  test('set overwrites existing value', () => {
    const store = Part.dense('hp', 8);
    const id = 'e-test-overwrite' as EntityId;

    store.set(id, 10);
    store.set(id, 20);
    expect(store.get(id)).toBe(20);
    expect(store.count).toBe(1);
  });

  test('delete removes entity and swap-removes correctly', () => {
    const store = Part.dense('hp', 8);
    const a = 'e-a' as EntityId;
    const b = 'e-b' as EntityId;
    const c = 'e-c' as EntityId;

    store.set(a, 1);
    store.set(b, 2);
    store.set(c, 3);
    expect(store.count).toBe(3);

    // Delete the middle element -- last element swaps into its slot
    const deleted = store.delete(b);
    expect(deleted).toBe(true);
    expect(store.count).toBe(2);
    expect(store.has(b)).toBe(false);
    expect(store.get(b)).toBeUndefined();

    // a and c should still be accessible
    expect(store.get(a)).toBe(1);
    expect(store.get(c)).toBe(3);
  });

  test('delete last element works', () => {
    const store = Part.dense('hp', 8);
    const a = 'e-a' as EntityId;
    store.set(a, 99);
    store.delete(a);
    expect(store.count).toBe(0);
    expect(store.has(a)).toBe(false);
  });

  test('delete returns false for missing entity', () => {
    const store = Part.dense('hp', 8);
    expect(store.delete('e-nope' as EntityId)).toBe(false);
  });

  test('view returns a Float64Array subarray of live data', () => {
    const store = Part.dense('speed', 16);

    store.set('e-0' as EntityId, 10);
    store.set('e-1' as EntityId, 20);
    store.set('e-2' as EntityId, 30);

    const v = store.view();
    expect(v).toBeInstanceOf(Float64Array);
    expect(v.length).toBe(3);
    expect(Array.from(v)).toEqual([10, 20, 30]);
  });

  test('entities returns entity IDs in dense order', () => {
    const store = Part.dense('mass', 8);

    store.set('e-a' as EntityId, 1);
    store.set('e-b' as EntityId, 2);
    store.set('e-c' as EntityId, 3);

    const ents = store.entities();
    expect(ents).toEqual(['e-a', 'e-b', 'e-c']);
  });

  test('throws ValidationError when capacity exceeded', () => {
    const store = Part.dense('tiny', 2);

    store.set('e-0' as EntityId, 1);
    store.set('e-1' as EntityId, 2);

    try {
      store.set('e-2' as EntityId, 3);
      expect.unreachable('expected set to throw');
    } catch (error) {
      expect(hasTag(error, 'ValidationError')).toBe(true);
    }
  });

  test('view updates after delete (swap-remove reflected)', () => {
    const store = Part.dense('x', 8);

    store.set('e-a' as EntityId, 100);
    store.set('e-b' as EntityId, 200);
    store.set('e-c' as EntityId, 300);

    store.delete('e-a' as EntityId);

    const v = store.view();
    expect(v.length).toBe(2);
    // After swap-remove of index 0: last element (300) moved to index 0, then 200 at index 1
    expect(store.get('e-c' as EntityId)).toBe(300);
    expect(store.get('e-b' as EntityId)).toBe(200);
  });

  test('name and capacity are preserved', () => {
    const store = Part.dense('gravity', 1024);
    expect(store.name).toBe('gravity');
    expect(store.capacity).toBe(1024);
  });
});

// ---------------------------------------------------------------------------
// World.tick() with dense systems
// ---------------------------------------------------------------------------

describe('World.tick() -- dense systems', () => {
  test('dense system iterates Float64Array in tick', () => {
    const { world } = World.make();
    const velocityStore = Part.dense('velocity', 64);

    world.addDenseStore(velocityStore);

    // Spawn entities and add to dense store
    const id1 = world.spawn();
    const id2 = world.spawn();
    const id3 = world.spawn();

    velocityStore.set(id1, 10);
    velocityStore.set(id2, 20);
    velocityStore.set(id3, 30);

    let sum = 0;

    world.addSystem({
      name: 'accumulator',
      query: ['velocity'],
      _denseSystem: true as const,
      execute(stores: ReadonlyMap<string, DenseStore>) {
        const vel = stores.get('velocity')!;
        const view = vel.view();
        for (let i = 0; i < view.length; i++) {
          sum += view[i]!;
        }
      },
    });

    world.tick();

    expect(sum).toBe(60);
  });

  test('dense system mutates data in-place via view', () => {
    const { world } = World.make();
    const posStore = Part.dense('posX', 64);

    world.addDenseStore(posStore);

    const id1 = world.spawn();
    const id2 = world.spawn();

    posStore.set(id1, 0);
    posStore.set(id2, 100);

    world.addSystem({
      name: 'mover',
      query: ['posX'],
      _denseSystem: true as const,
      execute(stores: ReadonlyMap<string, DenseStore>) {
        const pos = stores.get('posX')!;
        const data = pos.data;
        const len = pos.count;
        for (let i = 0; i < len; i++) {
          data[i] = data[i]! + 5;
        }
      },
    });

    world.tick();

    expect(posStore.get(id1)).toBe(5);
    expect(posStore.get(id2)).toBe(105);

    world.tick();

    expect(posStore.get(id1)).toBe(10);
    expect(posStore.get(id2)).toBe(110);
  });

  test('dense system skipped when queried store is missing', () => {
    const { world } = World.make();
    let called = false;

    world.addSystem({
      name: 'ghost',
      query: ['nonexistent'],
      _denseSystem: true as const,
      execute() {
        called = true;
      },
    });

    world.tick();
    expect(called).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Mixed dense + regular systems in the same world
// ---------------------------------------------------------------------------

describe('World.tick() -- mixed dense + regular systems', () => {
  test('both system types run in a single tick', () => {
    const results: string[] = [];

    const { world } = World.make();
    const speedStore = Part.dense('speed', 32);
    world.addDenseStore(speedStore);

    // Spawn an entity with a regular component
    const id = world.spawn({ label: 'player' });
    speedStore.set(id, 9.8);

    // Regular system
    world.addSystem({
      name: 'labeler',
      query: ['label'],
      execute(entities) {
        for (const e of entities) {
          results.push(`label:${e.components.get('label')}`);
        }
      },
    });

    // Dense system
    world.addSystem({
      name: 'speeder',
      query: ['speed'],
      _denseSystem: true as const,
      execute(stores: ReadonlyMap<string, DenseStore>) {
        const s = stores.get('speed')!;
        const v = s.view();
        for (let i = 0; i < v.length; i++) {
          results.push(`speed:${v[i]}`);
        }
      },
    });

    world.tick();

    expect(results).toEqual(['label:player', 'speed:9.8']);
  });

  test('despawn cleans up dense stores', () => {
    const { world } = World.make();
    const store = Part.dense('hp', 16);
    world.addDenseStore(store);

    const id = world.spawn();
    store.set(id, 100);
    expect(store.has(id)).toBe(true);

    world.despawn(id);
    expect(store.has(id)).toBe(false);
    expect(store.count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Within-tick read-current law
//
// THE LAW the SEAM:2 transport-swap must preserve: a regular system's
// `world.setComponent` write lands in the live entity map and is observed by
// a LATER system's `world.query` within the SAME tick. This is the exact
// semantic scene's SVGSystem depends on (it reads `_opacity`/`_blend` written
// by the Video/Transition systems earlier the same tick). Pinned here on the
// core primitive so the invariant is guarded independent of the scene layer.
// ---------------------------------------------------------------------------

describe('World.tick() -- within-tick read-current law', () => {
  test('a later system observes setComponent writes made by an earlier system the same tick', () => {
    const { world } = World.make();
    world.spawn({ marker: true });

    let observed: unknown = 'unwritten';

    // Writer runs first: persists a computed output component.
    world.addSystem({
      name: 'writer',
      query: ['marker'],
      execute(entities, w) {
        for (const e of entities) {
          w!.setComponent(e.id, '_computed', 42);
        }
      },
    });

    // Reader runs after: its query must see the write from THIS same tick.
    world.addSystem({
      name: 'reader',
      query: ['_computed'],
      execute(entities) {
        observed = entities[0]?.components.get('_computed');
      },
    });

    world.tick();

    expect(observed).toBe(42);
  });

  test('registration order decides visibility: a reader before the writer sees nothing this tick', () => {
    const { world } = World.make();
    world.spawn({ marker: true });

    const readsPerTick: (unknown)[] = [];

    // Reader runs FIRST — the write has not happened yet this tick.
    world.addSystem({
      name: 'early-reader',
      query: ['_computed'],
      execute(entities) {
        readsPerTick.push(entities[0]?.components.get('_computed'));
      },
    });

    world.addSystem({
      name: 'writer',
      query: ['marker'],
      execute(entities, w) {
        for (const e of entities) {
          w!.setComponent(e.id, '_computed', 7);
        }
      },
    });

    world.tick();
    // First tick: reader ran before writer, so it matched no `_computed` entity.
    expect(readsPerTick).toEqual([undefined]);

    world.tick();
    // Second tick: the write from tick 1 persists, so the early reader now sees it.
    expect(readsPerTick).toEqual([undefined, 7]);
  });
});

// ---------------------------------------------------------------------------
// Multi-store dense system queries
// ---------------------------------------------------------------------------

describe('Dense system -- multi-store query', () => {
  test('system receives multiple dense stores', () => {
    const { world } = World.make();
    const posX = Part.dense('posX', 32);
    const velX = Part.dense('velX', 32);

    world.addDenseStore(posX);
    world.addDenseStore(velX);

    const id1 = world.spawn();
    const id2 = world.spawn();

    posX.set(id1, 0);
    posX.set(id2, 50);
    velX.set(id1, 1);
    velX.set(id2, -2);

    world.addSystem({
      name: 'physics',
      query: ['posX', 'velX'],
      _denseSystem: true as const,
      execute(stores: ReadonlyMap<string, DenseStore>) {
        const pos = stores.get('posX')!;
        const vel = stores.get('velX')!;
        // Iterate entities from one store and look up in the other
        const ents = pos.entities();
        for (let i = 0; i < ents.length; i++) {
          const eid = ents[i]!;
          const v = vel.get(eid);
          if (v !== undefined) {
            pos.set(eid, pos.get(eid)! + v);
          }
        }
      },
    });

    world.tick();

    expect(posX.get(id1)).toBe(1);
    expect(posX.get(id2)).toBe(48);
  });
});

// ---------------------------------------------------------------------------
// Entity ID uniqueness invariants
// ---------------------------------------------------------------------------

describe('World.spawn -- entity ID uniqueness', () => {
  test('spawn without components produces unique EntityIds', () => {
    const { world } = World.make();
    const id1 = world.spawn();
    const id2 = world.spawn();
    const id3 = world.spawn();

    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);
    expect(id1).not.toBe(id3);
  });

  test('spawn with identical components produces unique EntityIds', () => {
    const { world } = World.make();
    const id1 = world.spawn({ type: 'bullet' });
    const id2 = world.spawn({ type: 'bullet' });

    expect(id1).not.toBe(id2);
  });
});
