import { describe } from 'vitest';
import { registerCheckNegativeControl, vitestFaultFixture } from '../../support/registered-check-negative-control.js';

describe('check/test negative control', () => {
  registerCheckNegativeControl(
    'the registered aggregate-test authority executes Vitest and rejects a planted failing assertion',
    {
      id: 'check/test',
      command: 'pnpm test',
      control: 'tests/unit/devops/test-aggregate-negative-control.test.ts',
      ...vitestFaultFixture('planted aggregate assertion'),
    },
  );
});
