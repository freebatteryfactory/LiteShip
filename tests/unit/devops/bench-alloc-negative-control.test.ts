import { describe, expect, it } from 'vitest';
import { computeRelative } from '../../../scripts/alloc-gate.js';
import { proveRegisteredCheckRejects } from '../../support/registered-check-negative-control.js';

describe('check/bench-alloc negative control', () => {
  it('the registered allocation authority blocks on a non-zero result', () => {
    const plantedRegression = computeRelative('planted allocating path', 100, 100, 0.1);
    expect(plantedRegression).toMatchObject({ ratio: 1, withinRatio: false });
    proveRegisteredCheckRejects(
      'check/bench-alloc',
      'pnpm run bench:alloc',
      'tests/unit/devops/bench-alloc-negative-control.test.ts',
    );
  });
});
