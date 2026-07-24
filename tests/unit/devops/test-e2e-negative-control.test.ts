import { describe, it } from 'vitest';
import { proveRegisteredCheckRejects } from '../../support/registered-check-negative-control.js';

describe('check/test-e2e negative control', () => {
  it('the registered browser authority blocks on a non-zero result', () => {
    proveRegisteredCheckRejects(
      'check/test-e2e',
      'pnpm run test:e2e',
      'tests/unit/devops/test-e2e-negative-control.test.ts',
    );
  });
});
