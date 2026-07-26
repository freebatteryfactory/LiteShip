import { describe, it } from 'vitest';
import { proveRegisteredCheckFalsifies, vitestFaultFixture } from '../../support/registered-check-negative-control.js';

describe('check/test negative control', () => {
  it('the registered aggregate-test authority executes Vitest and rejects a planted failing assertion', () => {
    proveRegisteredCheckFalsifies({
      id: 'check/test',
      command: 'pnpm test',
      control: 'tests/unit/devops/test-aggregate-negative-control.test.ts',
      ...vitestFaultFixture('planted aggregate assertion'),
    });
  });
});
