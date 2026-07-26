import { describe, it } from 'vitest';
import {
  playwrightFaultFixture,
  proveRegisteredCheckFalsifies,
} from '../../support/registered-check-negative-control.js';

describe('check/test-e2e negative control', () => {
  it('the registered browser route executes Playwright and rejects a planted failing assertion', () => {
    proveRegisteredCheckFalsifies({
      id: 'check/test-e2e',
      command: 'pnpm run test:e2e',
      control: 'tests/unit/devops/test-e2e-negative-control.test.ts',
      ...playwrightFaultFixture('planted browser assertion'),
    });
  });
});
