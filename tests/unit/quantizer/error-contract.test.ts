/** @czap/quantizer error contract */
import { describe, test, expect } from 'vitest';
import { hasTag } from '@czap/error';
import { Q, type MotionTier } from '@czap/quantizer';

describe('@czap/quantizer error contract', () => {
  test('unknown MotionTier throws ValidationError listing valid tiers', () => {
    expect(() => Q.from({ width: 800, height: 600 }, { tier: 'ghost' as MotionTier })).toThrow(/MotionTier/);
    try {
      Q.from({ width: 800, height: 600 }, { tier: 'ghost' as MotionTier });
    } catch (error) {
      expect(hasTag(error, 'ValidationError')).toBe(true);
    }
  });
});
