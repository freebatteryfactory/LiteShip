/**
 * The curated root is the complete Adaptive composition root. A consumer imports
 * only `liteship`; attrs/explain/plan all work without module-registration order.
 */
import { describe, expect, test } from 'vitest';
import { defineAdaptive } from '../../../packages/liteship/src/index.js';
import { computed } from '../../../packages/liteship/src/reactive.js';
import type { Computed } from '../../../packages/liteship/src/reactive.js';

const spec = {
  boundary: {
    input: 'viewport.width',
    at: [
      [0, 'sm'],
      [768, 'md'],
    ],
  },
  style: {
    base: { properties: { color: 'black' } },
    states: { md: { properties: { color: 'white' } } },
  },
  quantize: {
    outputs: { css: { sm: { color: 'black' }, md: { color: 'white' } } },
  },
} as const;

describe('liteship root Adaptive composition', () => {
  test('attrs, explain, and plan work from the root with no registration import', () => {
    const adaptive = defineAdaptive(spec);

    expect(adaptive.attrs()['data-liteship-directive']).toBe('adaptive');
    expect(adaptive.attrs()['data-liteship-style']).toBe(adaptive.style.id);
    expect(adaptive.explain(800).boundary.state).toBe('md');
    expect(adaptive.explain(800).quantized?.['css']?.value).toEqual({ color: 'white' });
    expect(adaptive.plan()).toMatchObject({
      boundaryId: adaptive.boundary.id,
      styleId: adaptive.style.id,
      quantizerId: adaptive.quantizer?.id,
      attrs: adaptive.attrs(),
    });
    expect(adaptive.plan().css).toContain('@layer liteship.components');
    expect(adaptive.plan().css).toContain('[data-liteship-state="md"]');
  });

  test('Computed<T> remains reachable from the governed reactive expert subpath', async () => {
    const value: Computed<number> = computed(() => 42);
    expect(value.read()).toBe(42);
    await value.dispose();
  });
});
