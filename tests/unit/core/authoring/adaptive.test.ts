/**
 * defineAdaptive — the pure-lowering facade.
 *
 * These tests prove the P15 thesis at the unit level: every member of the
 * returned Adaptive IS the hand-lowered constructor output (same content
 * address; for the quantizer, the SAME object via the configCache), and the
 * `explain`/`attrs`/`plan` projections read straight off those members.
 */
import { describe, expect, test } from 'vitest';
import { defineBoundary, defineStyle, defineToken, defineTheme } from '@liteship/core';
import { defineAdaptive } from '../../../../packages/liteship/src/index.js';
import { serializeBoundaryAttrValue } from '@liteship/core/authoring';
import { defineQuantizer } from '@liteship/quantizer';

const boundarySpec = {
  input: 'viewport.width',
  at: [
    [0, 'sm'],
    [768, 'md'],
    [1024, 'lg'],
  ],
} as const;

const styleSpec = {
  base: { properties: { 'font-size': '14px', color: 'black' } },
  states: { lg: { properties: { 'font-size': '18px' } } },
} as const;

const quantizeSpec = {
  outputs: {
    css: {
      sm: { fontSize: '14px' },
      md: { fontSize: '16px' },
      lg: { fontSize: '18px' },
    },
  },
} as const;

describe('defineAdaptive — pure lowering', () => {
  test('lowers to members whose ids equal the hand-lowered constructor outputs', () => {
    const adaptive = defineAdaptive({ boundary: boundarySpec, style: styleSpec, quantize: quantizeSpec });

    const hb = defineBoundary(boundarySpec);
    const hs = defineStyle({ boundary: hb, ...styleSpec });
    const hq = defineQuantizer(hb, quantizeSpec);

    expect(adaptive.boundary.id).toBe(hb.id);
    expect(adaptive.style.id).toBe(hs.id);
    expect(adaptive.quantizer?.id).toBe(hq.id);
    expect(adaptive.boundary).toEqual(hb);
    expect(adaptive.style).toEqual(hs);
  });

  test('rejects a phantom output target at the type level (closed to css/glsl/wgsl/aria/ai)', () => {
    // The quantizer runtime resolves ONLY css/glsl/wgsl/aria/ai; a phantom target
    // (here `cs`, a typo for `css`) is silently dropped at runtime, so the type
    // forbids it — this is the compile-time proof that `explain()` can never report
    // a target the runtime won't produce.
    const adaptive = defineAdaptive({
      boundary: boundarySpec,
      style: styleSpec,
      quantize: {
        outputs: {
          css: { sm: { fontSize: '14px' }, md: { fontSize: '16px' }, lg: { fontSize: '18px' } },
          // @ts-expect-error `cs` is not a real quantizer target (css/glsl/wgsl/aria/ai only).
          cs: { sm: { fontSize: '14px' } },
        },
      },
    });
    expect(adaptive.id).toMatch(/^fnv1a:/);
  });

  test('the quantizer member is REFERENTIALLY the hand-lowered defineQuantizer (configCache)', () => {
    const adaptive = defineAdaptive({ boundary: boundarySpec, style: styleSpec, quantize: quantizeSpec });
    const hb = defineBoundary(boundarySpec);
    const hq = defineQuantizer(hb, quantizeSpec);

    // Same content address AND the same object instance — proves the facade
    // CALLS the real memoized constructor, never a reimplementation.
    expect(adaptive.quantizer).toBe(hq);
  });

  test('the aggregate id addresses the member ids (changes when a member changes)', () => {
    const a = defineAdaptive({ boundary: boundarySpec, style: styleSpec });
    const b = defineAdaptive({ boundary: boundarySpec, style: styleSpec, quantize: quantizeSpec });
    expect(a.id).toMatch(/^fnv1a:/);
    expect(b.id).toMatch(/^fnv1a:/);
    // Adding a quantizer member changes the aggregate address.
    expect(a.id).not.toBe(b.id);
    // Same spec → same aggregate address (deterministic).
    const a2 = defineAdaptive({ boundary: boundarySpec, style: styleSpec });
    expect(a2.id).toBe(a.id);
  });

  test('tokens and theme lower to the hand-lowered constructor outputs', () => {
    const tokenSpec = { name: 'gap', category: 'spacing', value: '8px' } as const;
    const themeSpec = {
      name: 'brand',
      variants: ['light', 'dark'],
      tokens: { bg: { light: '#fff', dark: '#111' } },
    } as const;

    const adaptive = defineAdaptive({
      boundary: boundarySpec,
      style: styleSpec,
      tokens: [tokenSpec],
      theme: themeSpec,
    });

    const ht = defineToken(tokenSpec);
    const hth = defineTheme(themeSpec);
    expect(adaptive.tokens?.[0]?.id).toBe(ht.id);
    expect(adaptive.theme?.id).toBe(hth.id);
    expect(adaptive.tokens?.[0]).toEqual(ht);
    expect(adaptive.theme).toEqual(hth);
  });
});

describe('defineAdaptive — optional members undefined', () => {
  test('a spec with no quantize/tokens/theme leaves those members undefined', () => {
    const adaptive = defineAdaptive({ boundary: boundarySpec, style: styleSpec });
    expect(adaptive.quantizer).toBeUndefined();
    expect(adaptive.tokens).toBeUndefined();
    expect(adaptive.theme).toBeUndefined();
    // Present members are still real.
    expect(adaptive.boundary._tag).toBe('BoundaryDef');
    expect(adaptive.style._tag).toBe('StyleDef');
    // plan() omits the quantizerId when there is no quantizer.
    expect(adaptive.plan().quantizerId).toBeUndefined();
    // explain() omits `quantized` when there is no quantizer.
    expect(adaptive.explain(800).quantized).toBeUndefined();
  });
});

describe('defineAdaptive.explain', () => {
  const adaptive = defineAdaptive({
    boundary: boundarySpec,
    style: styleSpec,
    quantize: quantizeSpec,
  });

  test('resolves state / matched / quantized / style / tier across widths', () => {
    // Below the first non-zero threshold → 'sm'.
    const sm = adaptive.explain(400);
    expect(sm.input).toBe('viewport.width');
    expect(sm.value).toBe(400);
    expect(sm.boundary.state).toBe('sm');
    expect(sm.boundary.id).toBe(adaptive.boundary.id);
    expect(sm.contentAddress).toBe(adaptive.id);
    // matched: threshold i carries states[i]; satisfied = value >= threshold.
    expect(sm.boundary.matched).toEqual([
      { index: 0, threshold: 0, state: 'sm', satisfied: true },
      { index: 1, threshold: 768, state: 'md', satisfied: false },
      { index: 2, threshold: 1024, state: 'lg', satisfied: false },
    ]);
    expect(sm.quantized).toEqual({ css: { state: 'sm', value: { fontSize: '14px' } } });
    // base style at 'sm' (no state override applies).
    expect(sm.style['font-size']).toEqual({ value: '14px', source: 'base' });
    expect(sm.style['color']).toEqual({ value: 'black', source: 'base' });
    expect(sm.tier.tier).toBe('styled');
    expect(sm.tier.admittedTargets).toBeInstanceOf(Set);

    // At the middle threshold → 'md'.
    const md = adaptive.explain(768);
    expect(md.boundary.state).toBe('md');
    expect(md.boundary.matched[1]).toEqual({ index: 1, threshold: 768, state: 'md', satisfied: true });
    expect(md.quantized).toEqual({ css: { state: 'md', value: { fontSize: '16px' } } });

    // Above the top threshold → 'lg'; the state layer overrides font-size.
    const lg = adaptive.explain(1400);
    expect(lg.boundary.state).toBe('lg');
    expect(lg.boundary.matched.every((m) => m.satisfied)).toBe(true);
    expect(lg.quantized).toEqual({ css: { state: 'lg', value: { fontSize: '18px' } } });
    // font-size came from the 'lg' state layer; color still from base.
    expect(lg.style['font-size']).toEqual({ value: '18px', source: 'state' });
    expect(lg.style['color']).toEqual({ value: 'black', source: 'base' });
  });

  test('honours an explicit tier', () => {
    const gpu = defineAdaptive({ boundary: boundarySpec, style: styleSpec, tier: 'gpu' });
    expect(gpu.explain(800).tier.tier).toBe('gpu');
  });

  test('provenance is by DECLARATION: a same-value state override reads as `state`, not `base`', () => {
    // The 'lg' state re-declares `color` with the SAME string as base. Declaration
    // (not value equality) decides provenance: `color` is the state layer's winning
    // declaration → `state`; `font-size` (declared only in base) → `base`.
    const sameValueOverride = {
      base: { properties: { color: 'black', 'font-size': '14px' } },
      states: { lg: { properties: { color: 'black' } } },
    } as const;
    const adaptive = defineAdaptive({ boundary: boundarySpec, style: sameValueOverride });

    const lg = adaptive.explain(1400);
    expect(lg.boundary.state).toBe('lg');
    expect(lg.style['color']).toEqual({ value: 'black', source: 'state' });
    expect(lg.style['font-size']).toEqual({ value: '14px', source: 'base' });

    // A state that declares nothing (e.g. 'sm') leaves every property `base`-sourced.
    const sm = adaptive.explain(400);
    expect(sm.style['color']).toEqual({ value: 'black', source: 'base' });
  });
});

describe('defineAdaptive.attrs / plan', () => {
  const adaptive = defineAdaptive({ boundary: boundarySpec, style: styleSpec, quantize: quantizeSpec });

  test('attrs() is the headless boundary attr set', () => {
    const attrs = adaptive.attrs();
    expect(attrs['class']).toBe('liteship-adaptive liteship-styled');
    expect(attrs['data-liteship-directive']).toBe('adaptive');
    expect(attrs['data-liteship-state']).toBe('sm');
    // The boundary payload comes from the ONE core serializer.
    expect(attrs['data-liteship-boundary']).toBe(serializeBoundaryAttrValue(adaptive.boundary));
    const payload = JSON.parse(attrs['data-liteship-boundary']!) as {
      id: string;
      input: string;
      thresholds: number[];
      states: string[];
      hysteresis?: number;
    };
    expect(payload.id).toBe(adaptive.boundary.id);
    expect(payload.input).toBe('viewport.width');
    expect(payload.states).toEqual(['sm', 'md', 'lg']);
    expect(payload.hysteresis).toBeUndefined();
  });

  test('plan() carries member ids, compiled CSS layers, and attrs', () => {
    const plan = adaptive.plan();
    expect(plan.boundaryId).toBe(adaptive.boundary.id);
    expect(plan.styleId).toBe(adaptive.style.id);
    expect(plan.quantizerId).toBe(adaptive.quantizer?.id);
    expect(typeof plan.css).toBe('string');
    expect(plan.css).toContain('@layer liteship.components');
    expect(plan.attrs).toEqual(adaptive.attrs());
  });
});
