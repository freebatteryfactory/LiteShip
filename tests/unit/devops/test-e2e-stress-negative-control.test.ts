import { describe, it } from 'vitest';
import { proveRegisteredCheckRejects } from '../../support/registered-check-negative-control.js';

describe('check/test-e2e-stress negative control', () => {
  it('the registered capture-stress authority blocks on a non-zero result', () => {
    proveRegisteredCheckRejects(
      'check/test-e2e-stress',
      'pnpm run test:e2e:stress',
      'tests/unit/devops/test-e2e-stress-negative-control.test.ts',
    );
  });
});
