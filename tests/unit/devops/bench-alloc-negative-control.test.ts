import { describe, expect, it } from 'vitest';
import { computeRelative } from '../../../scripts/alloc-gate.js';

describe('check/bench-alloc negative control', () => {
  it('the allocation verdict owner rejects a planted over-budget path', () => {
    const plantedRegression = computeRelative('planted allocating path', 100, 100, 0.1);
    expect(plantedRegression).toMatchObject({ ratio: 1, withinRatio: false });
    const neutralized = computeRelative('neutralized allocating path', 0, 100, 0.1);
    expect(neutralized).toMatchObject({ ratio: 0, withinRatio: true });
  });
});
