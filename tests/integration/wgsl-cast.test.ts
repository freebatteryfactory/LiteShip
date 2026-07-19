// @vitest-environment jsdom
/**
 * WGSL cast end-to-end (D1-WGSL): the live `@wgsl` data path, build → edge →
 * runtime, proven across both halves of the spine.
 *
 * 1. **Compositor `emit-wgsl`** — the live per-quantizer WGSL channel populates
 *    `outputs.wgsl` (bare snake_case key → state index), mirroring `emit-glsl`,
 *    and is escalation-gated: `wgsl` is admitted only at the `gpu` rung, so a
 *    policy that affords only the `animated` rung drops `wgsl` (and `glsl`),
 *    while an absent policy is pass-through.
 * 2. **Boundary payload → `detail.wgsl`** — `satelliteAttrs` folds authored
 *    per-state `@wgsl` binding values onto the boundary payload (`stateWgsl`);
 *    `parseBoundary` reads them back; `applyBoundaryState` resolves
 *    `stateWgsl[currentState]` into the `liteship:uniform-update` event's
 *    `detail.wgsl` so the WGSL `client:gpu` runtime rebinds the live uniform
 *    buffer on every crossing (NOT frozen at the SSR'd initial state).
 *
 * The WebGPU device itself is exercised in `tests/unit/astro/wgpu-runtime.test.ts`
 * (structural-interface stubs + a real-device GUARD). This file is pure logic —
 * the payload→detail mapping — so it always runs, no GPU required.
 *
 * @module
 */
import { describe, test, expect } from 'vitest';
import { Boundary, Compositor, Cap, sealNode, projectionKeys, wgslIdent, PROJECTION_KEYS_SOURCE } from '@liteship/core';
import type { PolicyNode, RuntimeSite, CapTier, CapSet, CellMeta, ContentAddress } from '@liteship/core';
import { satelliteAttrs } from '@liteship/astro';
import { applyBoundaryState, parseBoundary } from '../../packages/astro/src/runtime/boundary.js';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

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
    changes: null as never,
    evaluate(value: number) {
      currentState = Boundary.evaluate(boundary, value) as string;
      return currentState;
    },
  };
}

const META: CellMeta = {
  created: { wall_ms: 0, counter: 0, node_id: 't' },
  updated: { wall_ms: 0, counter: 0, node_id: 't' },
  version: 1,
};

/** Grant every rung up to and including `top` so `requires` is always reachable. */
const grantUpTo = (top: CapTier): CapSet => {
  const ALL: readonly CapTier[] = ['static', 'styled', 'reactive', 'animated', 'gpu'];
  return Cap.from(ALL.filter((l) => Cap.ordinal(l) <= Cap.ordinal(top)));
};

function policy(opts: {
  requires: CapTier;
  grants: CapSet;
  sites: readonly RuntimeSite[];
  budgets?: PolicyNode['budgets'];
}): PolicyNode {
  return sealNode({
    _tag: 'DocGraphPolicyNode',
    _version: 1,
    family: 'policy',
    id: '',
    meta: META,
    appliesTo: [],
    requires: opts.requires,
    grants: opts.grants,
    sites: opts.sites,
    budgets: opts.budgets,
  } as unknown as PolicyNode);
}

// ---------------------------------------------------------------------------
// 0. Projection key: the wgslKey derivation + worker-blob twin
// ---------------------------------------------------------------------------

describe('wgslKey — bare snake_case, no u_ prefix (matches the WGSL compiler toFieldName)', () => {
  test('projectionKeys.wgslKey is the glsl snake fold minus the u_ prefix', () => {
    expect(projectionKeys('blurRadius').wgslKey).toBe('blur_radius');
    expect(projectionKeys('my-thing').wgslKey).toBe('my_thing');
    expect(projectionKeys('hero').wgslKey).toBe('hero');
    // GLSL prefixes u_, WGSL does not — the two arms share the snake fold only.
    expect(projectionKeys('blurRadius').glslKey).toBe('u_blur_radius');
  });

  test('the worker-blob twin agrees with projectionKeys on wgslKey', () => {
    const blob = new Function('name', `${PROJECTION_KEYS_SOURCE}\nreturn projectionKeys(name);`) as (name: string) => {
      wgslKey: string;
    };
    for (const name of ['hero', 'blurRadius', 'a-b-c', 'Section2']) {
      expect(blob(name).wgslKey).toBe(wgslIdent(name));
    }
  });
});

// ---------------------------------------------------------------------------
// 1. Compositor emit-wgsl + escalation gate
// ---------------------------------------------------------------------------

describe('compositor emit-wgsl: live WGSL channel, escalation-gated at the gpu rung', () => {
  test('pass-through (no policy): outputs.wgsl carries the live state index under the fixed state_index field', async () => {
    const compositor = Compositor.create({ runtimeSite: 'browser' }).compositor;
    compositor.add('blurRadius', makeQuantizer(widthBoundary, 'tablet'));
    const state = compositor.compute();

    // The WGSL state index lands in the single fixed `state_index` field that the
    // WGSL compiler generates and wgpu.ts reads from slot 0 — 'tablet' = index 1.
    expect(state.outputs.wgsl['state_index']).toBe(1);
    // glsl mirrors it under the per-quantizer u_ key.
    expect(state.outputs.glsl['u_blur_radius']).toBe(1);
  });

  test('gpu-rung policy admits wgsl (the heaviest target)', async () => {
    const p = policy({ requires: 'gpu', grants: grantUpTo('gpu'), sites: ['browser'] });
    const compositor = Compositor.create({ runtimeSite: 'browser', getPolicy: () => p }).compositor;
    compositor.add('layout', makeQuantizer(widthBoundary, 'desktop'));
    const state = compositor.compute();

    // desktop = state index 2; gpu rung admits css/glsl/wgsl/aria.
    expect(state.outputs.wgsl['state_index']).toBe(2);
    expect(state.outputs.glsl['u_layout']).toBe(2);
    expect(state.outputs.css['--liteship-layout']).toBe('desktop');
  });

  test('animated-rung policy drops wgsl but keeps glsl (wgsl is strictly above glsl)', async () => {
    // requires gpu but a tight p95 budget downgrades to the animated rung, which
    // admits css/glsl/aria — NOT wgsl. This is the budget-leak the gate prevents.
    const p = policy({
      requires: 'gpu',
      grants: grantUpTo('gpu'),
      sites: ['browser'],
      budgets: { p95Ms: 12 },
    });
    const compositor = Compositor.create({ runtimeSite: 'browser', getPolicy: () => p }).compositor;
    compositor.add('layout', makeQuantizer(widthBoundary, 'mobile'));
    const state = compositor.compute();

    // wgsl dropped; glsl + css survive.
    expect(state.outputs.wgsl['layout']).toBeUndefined();
    expect(state.outputs.glsl['u_layout']).toBe(0);
    expect(state.outputs.css['--liteship-layout']).toBe('mobile');
  });

  test('unsatisfiable policy ({error} branch) denies wgsl along with every target', async () => {
    // Policy admits only 'node'; compositor runs at 'browser' → chooseTier errors → deny-all.
    const p = policy({ requires: 'gpu', grants: grantUpTo('gpu'), sites: ['node'] });
    const compositor = Compositor.create({ runtimeSite: 'browser', getPolicy: () => p }).compositor;
    compositor.add('layout', makeQuantizer(widthBoundary, 'desktop'));
    const state = compositor.compute();

    expect(state.discrete['layout']).toBe('desktop');
    expect(state.outputs.wgsl['layout']).toBeUndefined();
    expect(state.outputs.glsl['u_layout']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 2. Boundary payload → detail.wgsl (serialize → parse → apply)
// ---------------------------------------------------------------------------

const authoredWgsl = {
  mobile: { blur_radius: 2.0 },
  tablet: { blur_radius: 1.0 },
  desktop: { blur_radius: 0.0 },
} as const;

describe('authored @wgsl: serialize → parse → apply (live uniform binding)', () => {
  test('satelliteAttrs folds stateWgsl onto the boundary payload', () => {
    const attrs = satelliteAttrs({ boundary: widthBoundary, wgsl: authoredWgsl });
    const payload = JSON.parse(attrs['data-liteship-boundary']!) as { stateWgsl?: unknown };
    expect(payload.stateWgsl).toEqual(authoredWgsl);
  });

  test('parseBoundary reads stateWgsl back into the RuntimeBoundary', () => {
    const attrs = satelliteAttrs({ boundary: widthBoundary, wgsl: authoredWgsl });
    const runtime = parseBoundary(attrs['data-liteship-boundary']!);
    expect(runtime?.stateWgsl).toEqual(authoredWgsl);
  });

  test('applyBoundaryState resolves stateWgsl[currentState] into detail.wgsl on every crossing', () => {
    const attrs = satelliteAttrs({ boundary: widthBoundary, wgsl: authoredWgsl });
    const runtime = parseBoundary(attrs['data-liteship-boundary']!)!;
    const el = document.createElement('div');
    const seen: Array<Record<string, number>> = [];
    el.addEventListener('liteship:uniform-update', (e) => {
      seen.push((e as CustomEvent<{ wgsl: Record<string, number> }>).detail.wgsl);
    });

    applyBoundaryState(el, runtime, { discrete: { [runtime.name]: 'mobile' } }, 'liteship:state');
    applyBoundaryState(el, runtime, { discrete: { [runtime.name]: 'desktop' } }, 'liteship:state');

    expect(seen[0]).toEqual({ blur_radius: 2.0 });
    expect(seen[1]).toEqual({ blur_radius: 0.0 });
  });

  test('vec2 stateWgsl values round-trip through payload parse into detail.wgsl', () => {
    const authored = {
      mobile: { uv: [0.25, 0.5] },
      tablet: { uv: [0.75, 1] },
      desktop: { uv: [1.25, 1.5] },
    } as const;
    const attrs = satelliteAttrs({ boundary: widthBoundary, wgsl: authored });
    const runtime = parseBoundary(attrs['data-liteship-boundary']!)!;
    const el = document.createElement('div');
    const seen: unknown[] = [];
    el.addEventListener('liteship:uniform-update', (e) => {
      seen.push((e as CustomEvent<{ wgsl: Record<string, unknown> }>).detail.wgsl.uv);
    });

    applyBoundaryState(el, runtime, { discrete: { [runtime.name]: 'tablet' } }, 'liteship:state');

    expect(seen).toEqual([authored.tablet.uv]);
  });

  test('compositor outputs.wgsl flows through applyBoundaryState into detail.wgsl', () => {
    // The other half: a live compositor `outputs.wgsl` map (state index) reaches
    // the event detail unchanged, so a runtime with no authored values still
    // gets the per-quantizer numeric channel.
    const runtime = parseBoundary(satelliteAttrs({ boundary: widthBoundary })['data-liteship-boundary']!)!;
    const el = document.createElement('div');
    let seen: Record<string, number> | undefined;
    el.addEventListener('liteship:uniform-update', (e) => {
      seen = (e as CustomEvent<{ wgsl: Record<string, number> }>).detail.wgsl;
    });

    applyBoundaryState(
      el,
      runtime,
      { discrete: { [runtime.name]: 'tablet' }, outputs: { wgsl: { blur_radius: 1 } } },
      'liteship:state',
    );
    expect(seen).toEqual({ blur_radius: 1 });
  });

  test('a boundary with no authored @wgsl is unaffected (no stateWgsl, empty detail.wgsl)', () => {
    const attrs = satelliteAttrs({ boundary: widthBoundary });
    const payload = JSON.parse(attrs['data-liteship-boundary']!) as { stateWgsl?: unknown };
    expect(payload.stateWgsl).toBeUndefined();
    const runtime = parseBoundary(attrs['data-liteship-boundary']!)!;
    expect(runtime.stateWgsl).toBeUndefined();

    const el = document.createElement('div');
    let seen: Record<string, number> | undefined;
    el.addEventListener('liteship:uniform-update', (e) => {
      seen = (e as CustomEvent<{ wgsl: Record<string, number> }>).detail.wgsl;
    });
    applyBoundaryState(el, runtime, { discrete: { [runtime.name]: 'mobile' } }, 'liteship:state');
    expect(seen).toEqual({});
  });
});
