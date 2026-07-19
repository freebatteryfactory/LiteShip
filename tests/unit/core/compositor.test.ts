/**
 * Compositor -- DirtyFlags integration, pool, FrameBudget, batching.
 *
 * Wave 2 / SEAM 4: the compositor's reactive seam was swapped from Effect
 * (`Compositor.create` → scoped Effect, `add`/`remove`/`compute`/`setBlendWeights`
 * → Effect, `changes` → `Stream`) onto the extracted replay-1 `CellKernel`:
 * `create` now returns `{ compositor, lifetime }` synchronously, the mutators are
 * plain sync, and `changes` is the kernel's read-only replay-1 subscription
 * surface (`subscribe(sink) → disposer`, replaying the current live state on
 * attach). The pure compose kernel (`computeStateSync`) is byte-identical — only
 * the transport changed, so every assertion below is preserved.
 */

import { describe, test, expect } from 'vitest';
import { Boundary, Compositor, DIRTY_FLAGS_MAX } from '@liteship/core';
import type { CompositeState } from '@liteship/core';

const widthBoundary = Boundary.make({
  input: 'viewport.width',
  at: [
    [0, 'mobile'],
    [768, 'tablet'],
    [1024, 'desktop'],
  ] as const,
});

function makeQuantizer(boundary: Boundary.Shape, initialState?: string) {
  let currentState = initialState ?? (boundary.states[0] as string);
  return {
    boundary,
    stateSync: () => currentState,
    changes: null as any, // Not used in these tests
    evaluate(value: number) {
      currentState = Boundary.evaluate(boundary, value) as string;
      return currentState;
    },
    _setState(s: string) {
      currentState = s;
    },
  };
}

describe('Compositor', () => {
  describe('basic operations', () => {
    test('create returns a compositor paired with its Lifetime', () => {
      const { compositor, lifetime } = Compositor.create();
      expect(compositor).toBeDefined();
      expect(compositor.add).toBeDefined();
      expect(compositor.remove).toBeDefined();
      expect(compositor.compute).toBeDefined();
      expect(lifetime).toBeDefined();
      expect(lifetime._tag).toBe('Lifetime');
    });

    test('compute on empty compositor returns empty state', () => {
      const { compositor } = Compositor.create();
      const state = compositor.compute();
      expect(state.discrete).toEqual({});
      expect(state.outputs.css).toEqual({});
    });

    test('add quantizer and compute produces output', () => {
      const { compositor } = Compositor.create();
      const q = makeQuantizer(widthBoundary, 'mobile');

      compositor.add('layout', q);
      const state = compositor.compute();

      expect(state.discrete['layout']).toBe('mobile');
      expect(state.outputs.css['--liteship-layout']).toBe('mobile');
      expect(state.outputs.glsl['u_layout']).toBe(0);
      expect(state.outputs.aria['data-liteship-layout']).toBe('mobile');
    });

    test('remove quantizer clears its output', () => {
      const { compositor } = Compositor.create();
      const q = makeQuantizer(widthBoundary, 'tablet');

      compositor.add('layout', q);
      compositor.remove('layout');
      const state = compositor.compute();

      expect(state.discrete['layout']).toBeUndefined();
    });
  });

  describe('DirtyFlags integration', () => {
    test('only dirty quantizers recompute', () => {
      const { compositor } = Compositor.create();
      const q1 = makeQuantizer(widthBoundary, 'mobile');
      const q2 = makeQuantizer(widthBoundary, 'tablet');

      compositor.add('q1', q1);
      compositor.add('q2', q2);

      // First compute should include both
      const state1 = compositor.compute();
      expect(state1.discrete['q1']).toBe('mobile');
      expect(state1.discrete['q2']).toBe('tablet');

      // Change q1's state, mark dirty via setBlendWeights
      q1._setState('desktop');
      compositor.setBlendWeights('q1', { desktop: 1 });

      // Compute — q2 should still be present from previous state
      const state2 = compositor.compute();
      expect(state2.discrete['q2']).toBe('tablet');
      expect(state2.blend['q1']).toEqual({ desktop: 1 });
    });
  });

  describe('blend weights', () => {
    test('setBlendWeights overrides auto-computed weights', () => {
      const { compositor } = Compositor.create();
      const q = makeQuantizer(widthBoundary, 'mobile');

      compositor.add('layout', q);
      compositor.setBlendWeights('layout', { mobile: 0.5, tablet: 0.5 });

      const state = compositor.compute();
      expect(state.blend['layout']).toEqual({ mobile: 0.5, tablet: 0.5 });
    });
  });

  describe('pool integration', () => {
    test('custom pool capacity is accepted', () => {
      const { compositor } = Compositor.create({ poolCapacity: 4 });
      expect(compositor).toBeDefined();
    });
  });

  describe('scheduleBatch', () => {
    test('scheduleBatch is callable', () => {
      const { compositor } = Compositor.create();
      // Should not throw
      compositor.scheduleBatch();
    });

    test('scheduleBatch coalesces duplicate calls in the same microtask turn', async () => {
      const { compositor } = Compositor.create();
      const q = makeQuantizer(widthBoundary, 'mobile');

      compositor.add('layout', q);
      compositor.scheduleBatch();
      compositor.scheduleBatch();
      await Promise.resolve();

      const state = compositor.compute();
      expect(state.discrete['layout']).toBe('mobile');
    });
  });

  describe('runtime hot-path branches', () => {
    test('respects frame-budget gating for glsl and aria emission', () => {
      const { compositor } = Compositor.create({
        frameBudget: {
          canRun(priority: string) {
            return priority === 'medium';
          },
        } as never,
      });
      const q = makeQuantizer(widthBoundary, 'tablet');

      compositor.add('layout', q);
      const state = compositor.compute();

      expect(state.outputs.css['--liteship-layout']).toBe('tablet');
      expect(state.outputs.glsl['u_layout']).toBeUndefined();
      expect(state.outputs.aria['data-liteship-layout']).toBeUndefined();
    });

    test('uses speculative prefetched states and clears them when confidence drops', () => {
      const { compositor } = Compositor.create({ speculative: true });
      const q = makeQuantizer(widthBoundary, 'mobile');

      compositor.add('layout', q);

      compositor.evaluateSpeculative('layout', 767.9, 1);
      let state = compositor.compute();
      expect(state.discrete['layout']).toBe('tablet');

      q._setState('mobile');
      compositor.evaluateSpeculative('layout', 640, 0);
      compositor.setBlendWeights('layout', { mobile: 1 });
      state = compositor.compute();
      expect(state.discrete['layout']).toBe('mobile');
    });

    test('prefers stateSync and tolerates undefined discrete states on the emit path', () => {
      const { compositor } = Compositor.create();
      const q = {
        ...makeQuantizer(widthBoundary, 'mobile'),
        stateSync: () => undefined,
      };

      compositor.add('layout', q as never);
      const state = compositor.compute();

      expect(state.discrete['layout']).toBeUndefined();
      expect(state.outputs.css['--liteship-layout']).toBeUndefined();
      expect(state.outputs.aria['data-liteship-layout']).toBeUndefined();
      expect(state.outputs.glsl['u_layout']).toBe(0);
      expect(state.blend['layout']).toEqual({});
    });

    test('recompute-all mode stays stable after exceeding the dirty-flag capacity', () => {
      const { compositor } = Compositor.create({ speculative: true });

      for (let index = 0; index <= DIRTY_FLAGS_MAX; index++) {
        compositor.add(`q${index}`, makeQuantizer(widthBoundary, 'mobile'));
      }

      compositor.evaluateSpeculative('q0', 767.9, 1);
      const state = compositor.compute();

      expect(Object.keys(state.discrete)).toHaveLength(DIRTY_FLAGS_MAX + 1);
      expect(state.discrete['q0']).toBe('tablet');
    });

    test('duplicate adds preserve runtime state both before and after dirty flags fall back to recompute-all mode', () => {
      const { compositor } = Compositor.create();
      const first = makeQuantizer(widthBoundary, 'mobile');
      const second = makeQuantizer(widthBoundary, 'tablet');

      compositor.add('layout', first);
      compositor.add('layout', second);
      let state = compositor.compute();

      expect(state.discrete['layout']).toBe('tablet');
      expect(state.blend['layout']).toEqual({ tablet: 1, mobile: 0, desktop: 0 });

      const { compositor: recomputeAll } = Compositor.create();
      for (let index = 0; index <= DIRTY_FLAGS_MAX; index++) {
        recomputeAll.add(`q${index}`, makeQuantizer(widthBoundary, 'mobile'));
      }

      recomputeAll.add('q0', makeQuantizer(widthBoundary, 'desktop'));
      state = recomputeAll.compute();

      expect(state.discrete['q0']).toBe('desktop');
      expect(state.blend['q0']).toEqual({ mobile: 0, tablet: 0, desktop: 1 });
    });
  });

  describe('multiple quantizers', () => {
    test('handles multiple quantizers correctly', () => {
      const { compositor } = Compositor.create();

      const colorBoundary = Boundary.make({
        input: 'prefers-color-scheme',
        at: [
          [0, 'light'],
          [1, 'dark'],
        ] as const,
      });

      const q1 = makeQuantizer(widthBoundary, 'tablet');
      const q2 = makeQuantizer(colorBoundary, 'light');

      compositor.add('layout', q1);
      compositor.add('theme', q2);

      const state = compositor.compute();
      expect(state.discrete['layout']).toBe('tablet');
      expect(state.discrete['theme']).toBe('light');
      expect(state.outputs.css['--liteship-layout']).toBe('tablet');
      expect(state.outputs.css['--liteship-theme']).toBe('light');
    });
  });

  describe('changes — replay-1 CellKernel subscription (reactive contract preserved after the transport swap)', () => {
    // The reactive publish is now the extracted replay-1 `CellKernel`
    // (`compositor.changes` = the kernel's read-only subscription surface). These
    // pin the same NOTIFICATION contract the old `Stream<CompositeState>` gave —
    // replay-current-on-subscribe, ordered delivery of every subsequent compose,
    // per-subscriber fan-out — but SYNCHRONOUSLY (no Effect fiber, no Queue): a
    // `subscribe(sink)` returns a disposer and the current live state is delivered
    // to the sink immediately on attach.
    //
    // NOTE on payload: `changes` delivers the POOLED CompositeState reference (the
    // two-slot rotation recycles it a tick later), a PRE-EXISTING property of the
    // pool-backed publish, identical under the old `SubscriptionRef.set`. These
    // tests therefore assert the NOTIFICATION contract (delivery count, ordering,
    // well-formed shape, fan-out) — not the pooled payload (unchanged + out of
    // scope).

    test('subscribe replays the current live state synchronously on attach (replay-1)', () => {
      const { compositor } = Compositor.create();
      compositor.add('layout', makeQuantizer(widthBoundary, 'tablet'));
      // `add` composed once; the current live state is now published to the kernel.

      // The current live state is delivered to a fresh subscriber synchronously,
      // exactly once, before any further compose — the replay-1 semantics.
      let count = 0;
      let first: CompositeState | undefined;
      const dispose = compositor.changes.subscribe((state) => {
        count += 1;
        if (count === 1) first = state;
      });
      expect(count).toBe(1);
      expect(first).toBeDefined();
      // `read()` exposes the same current live state the replay delivered.
      expect(compositor.changes.read()).toBeDefined();

      dispose();
      expect(compositor.changes.size).toBe(0);
    });

    test('a subscriber replays the current state on attach, then receives each subsequent compose', () => {
      const { compositor } = Compositor.create();
      compositor.add('layout', makeQuantizer(widthBoundary, 'mobile'));

      const collected: CompositeState[] = [];
      const dispose = compositor.changes.subscribe((state) => {
        collected.push(state);
      });
      // Replay-1: subscribe delivered the current live state synchronously.
      expect(collected.length).toBe(1);

      // Drive two more composes — each fans out synchronously to the subscriber.
      compositor.remove('layout');
      compositor.add('layout', makeQuantizer(widthBoundary, 'tablet'));

      // Replay (1) + two composes (2) = 3 ordered, well-formed emissions — the
      // notification contract the CellKernel swap preserves.
      expect(collected.length).toBe(3);
      for (const s of collected) {
        expect(s).toBeDefined();
        expect(s.discrete).toBeDefined();
        expect(s.outputs.css).toBeDefined();
        expect(s.outputs.glsl).toBeDefined();
        expect(s.outputs.aria).toBeDefined();
      }

      // Disposed → no further delivery.
      dispose();
      compositor.compute();
      expect(collected.length).toBe(3);
    });

    test('two subscribers each receive the replay and every subsequent compose (fan-out)', () => {
      const { compositor } = Compositor.create();
      compositor.add('layout', makeQuantizer(widthBoundary, 'mobile'));

      const a: CompositeState[] = [];
      const b: CompositeState[] = [];
      const da = compositor.changes.subscribe((s) => a.push(s)); // replay -> 1
      const db = compositor.changes.subscribe((s) => b.push(s)); // replay -> 1

      compositor.remove('layout');
      compositor.add('layout', makeQuantizer(widthBoundary, 'desktop')); // two more composes

      da();
      db();

      // Each subscriber independently sees replay (1) + two composes (2) = 3 —
      // the per-subscriber fan-out the CellKernel live-Set publish preserves.
      expect(a.length).toBe(3);
      expect(b.length).toBe(3);
      for (const s of [...a, ...b]) {
        expect(s.discrete).toBeDefined();
        expect(s.outputs.css).toBeDefined();
      }
    });

    test('disposing the lifetime closes the changes kernel: subscribers complete, publish goes inert', async () => {
      const { compositor, lifetime } = Compositor.create();
      compositor.add('layout', makeQuantizer(widthBoundary, 'mobile'));

      const seen: CompositeState[] = [];
      let completed = 0;
      compositor.changes.subscribe({
        next: (s) => seen.push(s),
        complete: () => {
          completed += 1;
        },
      });
      const countAtDispose = seen.length; // replay (1)
      expect(countAtDispose).toBe(1);

      await lifetime.dispose();
      expect(completed).toBe(1);
      expect(compositor.changes.closed).toBe(true);

      // After close the kernel is inert: a further compose fans out to nobody.
      compositor.compute();
      expect(seen.length).toBe(countAtDispose);

      // A late subscribe completes immediately without replaying or registering.
      let lateReplays = 0;
      let lateCompleted = 0;
      compositor.changes.subscribe({
        next: () => {
          lateReplays += 1;
        },
        complete: () => {
          lateCompleted += 1;
        },
      });
      expect(lateReplays).toBe(0);
      expect(lateCompleted).toBe(1);
      expect(compositor.changes.size).toBe(0);
    });
  });
});
