/** @liteship/quantizer error contract */
import { describe, test, expect } from 'vitest';
import { hasTag } from '@liteship/error';
import { defineQuantizer, type MotionTier } from '@liteship/quantizer';

describe('@liteship/quantizer error contract', () => {
  test('unknown MotionTier throws ValidationError listing valid tiers', () => {
    // Tier is validated before the boundary is ever touched, so an invalid tier
    // reds even against a bogus boundary shape.
    expect(() => defineQuantizer({ width: 800, height: 600 }, { outputs: {}, tier: 'ghost' as MotionTier })).toThrow(
      /MotionTier/,
    );
    try {
      defineQuantizer({ width: 800, height: 600 }, { outputs: {}, tier: 'ghost' as MotionTier });
    } catch (error) {
      expect(hasTag(error, 'ValidationError')).toBe(true);
    }
  });
});
