/**
 * StateCell / ProjectionState — typed authority over coarse runtime state (#130 child 5).
 *
 * @module
 */

import { describe, test, expect } from 'vitest';
import { StateCell, ProjectionState, StateCellStore, StateName, RuntimeCoordinator } from '@liteship/core';

describe('StateCell authority model', () => {
  test('discrete cells are replayable; continuous cells are not', () => {
    const discrete = StateCell.snapshot('layout', 'discrete', 'quantizer', 'mobile', 0, 1, 1);
    const continuous = StateCell.snapshot('scroll.progress', 'continuous', 'quantizer', 'live', 0, 1, 0, 0.42);

    expect(discrete.replayable).toBe(true);
    expect(StateCell.isReplayable(discrete)).toBe(true);
    expect(continuous.replayable).toBe(false);
    expect(StateCell.isReplayable(continuous)).toBe(false);
    expect(continuous.value).toBe(0.42);
  });

  test('fromResolved mirrors worker ResolvedStateEntry shape for gap-replay hydration', () => {
    const cell = StateCell.fromResolved({ name: 'layout', state: StateName('tablet'), generation: 7 }, 'graph', [
      'mobile',
      'tablet',
      'desktop',
    ]);

    expect(cell.name).toBe('layout');
    expect(cell.state).toBe('tablet');
    expect(cell.stateIndex).toBe(1);
    expect(cell.generation).toBe(7);
    expect(cell.authority).toBe('graph');
    expect(cell.replayable).toBe(true);
  });
});

describe('StateCellStore', () => {
  test('applyDiscrete increments generation only on index change and marks dirty', () => {
    const store = StateCellStore.create();
    store.register('layout', ['mobile', 'tablet', 'desktop']);

    const first = store.applyDiscrete('layout', 'mobile');
    expect(first.generation).toBe(0);
    expect(first.dirtyEpoch).toBe(2);

    const same = store.applyDiscrete('layout', 'mobile');
    expect(same.generation).toBe(0);

    const crossed = store.applyDiscrete('layout', 'tablet');
    expect(crossed.generation).toBe(1);
    expect(crossed.stateIndex).toBe(1);
    expect(crossed.state).toBe('tablet');
    expect(crossed.dirtyEpoch).toBe(4);
  });

  test('writeContinuous updates value without incrementing generation', () => {
    const store = StateCellStore.create();
    store.register('scroll.progress', ['live'], { kind: 'continuous' });

    const first = store.writeContinuous('scroll.progress', 0.25);
    expect(first.value).toBe(0.25);
    expect(first.generation).toBe(0);
    expect(first.replayable).toBe(false);

    const second = store.writeContinuous('scroll.progress', 0.75);
    expect(second.value).toBe(0.75);
    expect(second.generation).toBe(0);
  });

  test('refuses cross-kind mutations loudly', () => {
    const store = StateCellStore.create();
    store.register('layout', ['mobile', 'desktop']);
    store.register('scroll.progress', ['live'], { kind: 'continuous' });

    expect(() => store.writeContinuous('layout', 0.5)).toThrow(/discrete, not continuous/i);
    expect(() => store.applyDiscrete('scroll.progress', 'live')).toThrow(/continuous, not discrete/i);
  });

  test('applyDiscrete rejects unknown discrete state names loudly', () => {
    const store = StateCellStore.create();
    store.register('layout', ['mobile', 'tablet', 'desktop']);

    expect(() => store.applyDiscrete('layout', 'phablet' as never)).toThrow(/unknown discrete state/i);
    expect(() => store.hydrateDiscrete('layout', 'phablet' as never, 1)).toThrow(/unknown discrete state/i);
  });

  test('hydrateDiscrete restores generation for replay/bootstrap paths', () => {
    const store = StateCellStore.create();
    store.register('layout', ['mobile', 'tablet', 'desktop']);

    const hydrated = store.hydrateDiscrete('layout', 'desktop', 42, 'graph');
    expect(hydrated.state).toBe('desktop');
    expect(hydrated.stateIndex).toBe(2);
    expect(hydrated.generation).toBe(42);
    expect(hydrated.authority).toBe('graph');
  });

  test('hydrateDiscrete REFUSES a generation rollback — the cell stays byte-identical (#133)', () => {
    const store = StateCellStore.create();
    store.register('layout', ['mobile', 'tablet', 'desktop']);

    store.hydrateDiscrete('layout', 'desktop', 5, 'graph');
    // A stale/duplicate receipt at gen 4 must NOT roll the cell backward.
    const rolled = store.hydrateDiscrete('layout', 'tablet', 4, 'graph');
    expect(rolled.state).toBe('desktop');
    expect(rolled.generation).toBe(5);
    // A newer generation still advances it.
    const advanced = store.hydrateDiscrete('layout', 'mobile', 6, 'graph');
    expect(advanced.state).toBe('mobile');
    expect(advanced.generation).toBe(6);
  });

  test('hydrateDiscrete is IDEMPOTENT on a duplicate generation (no rollback, no double-apply)', () => {
    const store = StateCellStore.create();
    store.register('layout', ['mobile', 'tablet', 'desktop']);

    const first = store.hydrateDiscrete('layout', 'tablet', 3, 'graph');
    const duplicate = store.hydrateDiscrete('layout', 'desktop', 3, 'graph');
    // Same generation → the crossing is already applied; the duplicate is a no-op.
    expect(duplicate.state).toBe('tablet');
    expect(duplicate.generation).toBe(3);
    expect(duplicate.state).toBe(first.state);
  });

  test('hydrateDiscrete still installs the initial state at genesis (generation 0)', () => {
    const store = StateCellStore.create();
    store.register('layout', ['mobile', 'tablet', 'desktop']);

    const genesis = store.hydrateDiscrete('layout', 'desktop', 0, 'graph');
    expect(genesis.state).toBe('desktop');
    expect(genesis.generation).toBe(0);
  });

  test('wraps an existing RuntimeCoordinator without replacing it', () => {
    const runtime = RuntimeCoordinator.create({ capacity: 4 });
    runtime.registerQuantizer('theme', ['light', 'dark']);

    const store = StateCellStore.create(runtime);
    store.register('theme', ['light', 'dark']);

    store.applyDiscrete('theme', 'dark');
    expect(runtime.getStateIndex('theme')).toBe(1);
    expect(store.snapshot('theme')?.state).toBe('dark');
  });

  test('reset re-seeds registrations through the coordinator', () => {
    const store = StateCellStore.create();
    store.register('layout', ['mobile', 'desktop']);
    store.applyDiscrete('layout', 'desktop');

    store.reset([{ name: 'density', states: ['compact', 'comfortable'] }]);

    expect(store.snapshot('layout')).toBeUndefined();
    expect(store.snapshot('density')?.state).toBe('compact');
    expect(store.runtime.registeredNames()).toEqual(['density']);
  });
});

describe('ProjectionState aggregate', () => {
  test('fromCells picks max dirtyEpoch and first discrete resolvedState', () => {
    const cells = {
      layout: StateCell.snapshot('layout', 'discrete', 'quantizer', 'tablet', 1, 3, 2),
      theme: StateCell.snapshot('theme', 'discrete', 'policy', 'dark', 1, 5, 1),
      scroll: StateCell.snapshot('scroll.progress', 'continuous', 'quantizer', 'live', 0, 2, 0, 0.5),
    };

    const projection = ProjectionState.fromCells('hero', cells, {
      source: 'tier',
      detail: 'edge-client-hints',
    });

    expect(projection.projection).toBe('hero');
    expect(projection.dirtyEpoch).toBe(5);
    expect(projection.resolvedState).toBe('tablet');
    expect(projection.resolution).toEqual({ source: 'tier', detail: 'edge-client-hints' });
    expect(Object.keys(projection.cells)).toEqual(['layout', 'theme', 'scroll']);
  });

  test('store.projectionState builds from registered quantizers', () => {
    const store = StateCellStore.create();
    store.register('layout', ['mobile', 'tablet']);
    store.register('scroll.progress', ['live'], { kind: 'continuous', authority: 'graph' });

    store.applyDiscrete('layout', 'tablet');
    store.writeContinuous('scroll.progress', 0.33);
    store.markDirty('layout');

    const projection = store.projectionState('hero-boundary', {
      resolution: { source: 'synthetic', detail: 'no-signal' },
    });

    expect(projection.projection).toBe('hero-boundary');
    expect(projection.resolvedState).toBe('tablet');
    expect(projection.cells['scroll.progress']?.value).toBe(0.33);
    expect(projection.cells['scroll.progress']?.authority).toBe('graph');
    expect(projection.resolution?.source).toBe('synthetic');
  });
});
