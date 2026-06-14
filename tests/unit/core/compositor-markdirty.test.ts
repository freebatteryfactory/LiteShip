/**
 * Compositor evaluate→markDirty contract — the load-bearing freeze/unfreeze law.
 *
 * The Compositor recomputes a quantizer's projection ONLY when that quantizer is
 * marked dirty. A host (the Stage dual-export sweep, the worker compositor) drives
 * a quantizer's state out-of-band via `quantizer.evaluate(v)` and then signals the
 * compositor with `runtime.markDirty(name)`. The contract has TWO halves:
 *
 *   1. FREEZE: if the host mutates the quantizer but does NOT mark it dirty,
 *      `compute()` carries the previous composite forward verbatim — the discrete
 *      state, and every cast derived from it, stay frozen. (Recomputing silently
 *      would defeat selective recomputation and the pose-parked dual-export sweep.)
 *   2. UNFREEZE: once `runtime.markDirty(name)` fires, the NEXT `compute()` reflects
 *      the new evaluated state across discrete/css/glsl/wgsl.
 *
 * This is exactly the dual-export frozen-MP4 fix's contract: `dual-export.ts`
 * sweeps the input per frame with `quantizer.evaluate(...)` + `runtime.markDirty`,
 * relying on (2) to advance and on (1) for any frame it does not re-mark. A latent
 * bug where `runtime.markDirty` did not reconcile with the compositor's local dirty
 * flags would FREEZE every frame after the first (silent stale-frame MP4).
 *
 * @module
 */

import { describe, test, expect } from 'vitest';
import { Boundary, Compositor } from '@czap/core';
import { Effect } from 'effect';
import { runScopedAsync as runScoped } from '../../helpers/effect-test.js';

const widthBoundary = Boundary.make({
  input: 'viewport.width',
  at: [
    [0, 'mobile'],
    [768, 'tablet'],
    [1024, 'desktop'],
  ] as const,
});

/**
 * A LIVE quantizer: unlike the snapshot fixtures in the escalation suite, its
 * `state`/`stateSync` track whatever the last `evaluate(v)` resolved, so the
 * compositor reads the genuinely-current band when (and only when) it recomputes.
 */
function liveQuantizer(boundary: Boundary.Shape) {
  let current = boundary.states[0] as string;
  return {
    _tag: 'Quantizer' as const,
    boundary,
    state: Effect.sync(() => current),
    stateSync: () => current,
    changes: null as never,
    evaluate(v: number) {
      current = Boundary.evaluate(boundary, v) as string;
      return current;
    },
  };
}

describe('Compositor evaluate→markDirty contract', () => {
  test('LESSON (markDirty): a mutation WITHOUT markDirty freezes; runtime.markDirty unfreezes the next compute', async () => {
    // WHY: selective recomputation + the pose-parked dual-export sweep depend on
    // compute() being a pure function of (dirty set, current states). Drive the
    // quantizer's state out-of-band and prove the discrete/cast outputs freeze
    // until the dirty signal arrives — then snap to the new band.
    const compositor = await runScoped(Compositor.create({ runtimeSite: 'node' }));
    const q = liveQuantizer(widthBoundary);
    await Effect.runPromise(compositor.add('layout', q));

    // #1 — initial compute establishes the baseline (mobile / index 0).
    const s1 = await Effect.runPromise(compositor.compute());
    expect(s1.discrete['layout']).toBe('mobile');
    expect(s1.outputs.css['--czap-layout']).toBe('mobile');
    expect(s1.outputs.glsl['u_layout']).toBe(0);
    expect(s1.outputs.wgsl['state_index']).toBe(0);

    // Drive the quantizer DIRECTLY (not via the compositor) to a new band.
    expect(q.evaluate(800)).toBe('tablet');

    // #2 — NO markDirty: the composite must be FROZEN at the #1 snapshot.
    const s2 = await Effect.runPromise(compositor.compute());
    expect(s2.discrete['layout']).toBe('mobile');
    expect(s2.outputs.css['--czap-layout']).toBe('mobile');
    expect(s2.outputs.glsl['u_layout']).toBe(0);
    expect(s2.outputs.wgsl['state_index']).toBe(0);

    // Signal the crossing via the public runtime contract.
    compositor.runtime.markDirty('layout');

    // #3 — markDirty fired: the composite now reflects the NEW band everywhere.
    const s3 = await Effect.runPromise(compositor.compute());
    expect(s3.discrete['layout']).toBe('tablet');
    expect(s3.outputs.css['--czap-layout']).toBe('tablet');
    expect(s3.outputs.glsl['u_layout']).toBe(1);
    expect(s3.outputs.wgsl['state_index']).toBe(1);
  });

  test('LESSON (markDirty@sweep): a per-frame evaluate+markDirty sweep tracks each crossing (no frozen frames)', async () => {
    // WHY: this is the dual-export loop in miniature — sweep the input across the
    // threshold span, evaluate + markDirty each step, and assert the composite
    // advances monotonically through every band instead of freezing after frame 0.
    const compositor = await runScoped(Compositor.create({ runtimeSite: 'node' }));
    const q = liveQuantizer(widthBoundary);
    await Effect.runPromise(compositor.add('layout', q));

    const sweep = [0, 200, 768, 900, 1024, 1500];
    const seen: number[] = [];
    for (const v of sweep) {
      q.evaluate(v);
      compositor.runtime.markDirty('layout');
      const s = await Effect.runPromise(compositor.compute());
      // The numeric casts always agree with each other.
      expect(s.outputs.glsl['u_layout']).toBe(s.outputs.wgsl['state_index']);
      seen.push(s.outputs.glsl['u_layout']!);
    }
    // Expected bands for the sweep: mobile,mobile,tablet,tablet,desktop,desktop.
    expect(seen).toEqual([0, 0, 1, 1, 2, 2]);
  });
});
