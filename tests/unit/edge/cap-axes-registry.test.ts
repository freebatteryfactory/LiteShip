/**
 * The CAP_AXES registry is the single source for the `data-liteship-*` capability
 * vocabulary: the edge emitter, `Astro.locals.liteship.tiers`, and the runtime
 * readers all project from it, so an attribute name that disagrees with its
 * locals field is unrepresentable. This pins that the projection holds and that
 * the edge emit uses it — closing the data-liteship-cap-vs-data-liteship-tier drift.
 */
import { describe, test, expect } from 'vitest';
import { CAP_AXES, capAxisAttr } from '@liteship/detect';
import { EdgeTier } from '@liteship/edge';

describe('CAP_AXES — one source for the data-liteship-* capability vocabulary', () => {
  test('capAxisAttr projects the axis key INTO the attribute suffix (disagreement unrepresentable)', () => {
    for (const axis of CAP_AXES) {
      expect(capAxisAttr(axis)).toBe(`data-liteship-${axis}`);
    }
  });

  test('CAP_AXES is the canonical capability triple', () => {
    expect([...CAP_AXES]).toEqual(['tier', 'motion', 'design']);
  });

  test('edge tierDataAttributes emits exactly the registry attributes (capTier→tier)', () => {
    const attrs = EdgeTier.tierDataAttributes({
      capTier: 'reactive',
      motionTier: 'animations',
      designTier: 'enhanced',
    });
    expect(attrs).toBe(
      `${capAxisAttr('tier')}="reactive" ${capAxisAttr('motion')}="animations" ${capAxisAttr('design')}="enhanced"`,
    );
    // The renamed attribute is present and the old data-liteship-cap is gone.
    expect(attrs).toContain('data-liteship-tier="reactive"');
    expect(attrs).not.toContain('data-liteship-cap');
  });
});
