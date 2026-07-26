import { describe, it } from 'vitest';
import { proveRegisteredCheckFalsifies, vitestFaultFixture } from '../../support/registered-check-negative-control.js';

describe('check/test-redteam negative control', () => {
  it('the registered red-team route executes Vitest and rejects a planted adversarial assertion', () => {
    proveRegisteredCheckFalsifies({
      id: 'check/test-redteam',
      command: 'pnpm run test:redteam',
      control: 'tests/unit/devops/test-redteam-negative-control.test.ts',
      ...vitestFaultFixture('planted red-team assertion'),
    });
  });
});
