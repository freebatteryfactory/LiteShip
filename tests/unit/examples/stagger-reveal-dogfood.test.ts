/**
 * Stagger reveal dogfood — presets-as-data vertical slice (#124).
 *
 * @module
 */
import { describe, expect, test } from 'vitest';
import { lowerStaggerIntent } from '@liteship/core';
import { compileStagger } from '@liteship/compiler';
import { staggerRevealPreset } from '../../../examples/07-stagger-reveal/stagger-preset.js';

describe('examples/07-stagger-reveal dogfood (#124)', () => {
  test('preset lowers to graph and compiles per-child delays', () => {
    const lowered = lowerStaggerIntent(staggerRevealPreset);
    expect(lowered.items.map((i) => i.delayMs)).toEqual([0, 80, 160]);

    const compiled = compileStagger(lowered);
    expect(compiled.items).toHaveLength(3);
    expect(compiled.raw).toContain('animation-delay: 80ms');
    expect(compiled.raw).toContain('[data-liteship-boundary="item-0"]');
  });
});
