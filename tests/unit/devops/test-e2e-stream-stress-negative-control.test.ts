import { describe, it } from 'vitest';
import {
  playwrightFaultFixture,
  proveRegisteredCheckFalsifies,
} from '../../support/registered-check-negative-control.js';

describe('check/test-e2e-stream-stress negative control', () => {
  it('the registered stream-stress route repeats the real Playwright owner and preserves the planted red', () => {
    proveRegisteredCheckFalsifies({
      id: 'check/test-e2e-stream-stress',
      command: 'pnpm run test:e2e:stream-stress',
      control: 'tests/unit/devops/test-e2e-stream-stress-negative-control.test.ts',
      ...playwrightFaultFixture('planted stream-stress assertion', 2),
    });
  });
});
