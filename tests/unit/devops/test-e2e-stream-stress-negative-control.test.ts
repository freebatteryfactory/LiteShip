import { describe } from 'vitest';
import {
  playwrightFaultFixture,
  registerCheckNegativeControl,
} from '../../support/registered-check-negative-control.js';

describe('check/test-e2e-stream-stress negative control', () => {
  registerCheckNegativeControl(
    'the registered stream-stress route repeats the real Playwright owner and preserves the planted red',
    {
      id: 'check/test-e2e-stream-stress',
      command: 'pnpm run test:e2e:stream-stress',
      control: 'tests/unit/devops/test-e2e-stream-stress-negative-control.test.ts',
      ...playwrightFaultFixture('planted stream-stress assertion', 2),
    },
  );
});
