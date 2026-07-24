import { describe, it } from 'vitest';
import { proveRegisteredCheckRejects } from '../../support/registered-check-negative-control.js';

describe('check/test-redteam negative control', () => {
  it('the registered red-team authority blocks on a non-zero result', () => {
    proveRegisteredCheckRejects(
      'check/test-redteam',
      'pnpm run test:redteam',
      'tests/unit/devops/test-redteam-negative-control.test.ts',
    );
  });
});
