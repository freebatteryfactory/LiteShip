import { describe, expect, it } from 'vitest';
import { journeysPassed, type JourneyResult } from '../../journey/harness.js';
import { proveRegisteredCheckRejects } from '../../support/registered-check-negative-control.js';

describe('check/journey negative control', () => {
  it('the registered consumer-journey authority blocks on a non-zero result', () => {
    const failed: JourneyResult = { name: 'planted', status: 'fail', detail: 'fixture', notes: [] };
    expect(journeysPassed([failed])).toBe(false);
    expect(journeysPassed([])).toBe(false);
    proveRegisteredCheckRejects(
      'check/journey',
      'pnpm run test:journey',
      'tests/unit/devops/journey-negative-control.test.ts',
    );
  });
});
