import { describe } from 'vitest';
import {
  playwrightFaultFixture,
  registerCheckNegativeControl,
} from '../../support/registered-check-negative-control.js';

describe('check/test-e2e negative control', () => {
  registerCheckNegativeControl(
    'the registered browser route executes Playwright and rejects a planted failing assertion',
    {
      id: 'check/test-e2e',
      command: 'pnpm run test:e2e',
      control: 'tests/unit/devops/test-e2e-negative-control.test.ts',
      ...playwrightFaultFixture('planted browser assertion'),
    },
  );
});
