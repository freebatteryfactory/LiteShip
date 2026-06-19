/**
 * The CAP_AXES registry is the single source for the `data-czap-*` capability
 * vocabulary: the edge emitter, `Astro.locals.czap.tiers`, and the runtime
 * readers all project from it, so an attribute name that disagrees with its
 * locals field is unrepresentable. This pins that the projection holds and that
 * the edge emit uses it — closing the data-czap-cap-vs-data-czap-tier drift.
 */
import { describe, test, expect } from 'vitest';
import { CAP_AXES, capAxisAttr } from '@czap/detect';
import { EdgeTier } from '@czap/edge';

describe('CAP_AXES — one source for the data-czap-* capability vocabulary', () => {
  test('capAxisAttr projects the axis key INTO the attribute suffix (disagreement unrepresentable)', () => {
    for (const axis of CAP_AXES) {
      expect(capAxisAttr(axis)).toBe(`data-czap-${axis}`);
    }
  });

  test('CAP_AXES is the canonical capability triple', () => {
    expect([...CAP_AXES]).toEqual(['tier', 'motion', 'design']);
  });

  test('edge tierDataAttributes emits exactly the registry attributes (capLevel→tier)', () => {
    const attrs = EdgeTier.tierDataAttributes({
      capLevel: 'reactive',
      motionTier: 'animations',
      designTier: 'enhanced',
    });
    expect(attrs).toBe(
      `${capAxisAttr('tier')}="reactive" ${capAxisAttr('motion')}="animations" ${capAxisAttr('design')}="enhanced"`,
    );
    // The renamed attribute is present and the old data-czap-cap is gone.
    expect(attrs).toContain('data-czap-tier="reactive"');
    expect(attrs).not.toContain('data-czap-cap');
  });
});
