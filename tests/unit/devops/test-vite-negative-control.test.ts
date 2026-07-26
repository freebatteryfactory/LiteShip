import { describe, it } from 'vitest';
import { proveRegisteredCheckFalsifies, viteFaultFixture } from '../../support/registered-check-negative-control.js';

describe('check/test-vite negative control', () => {
  it('the registered Vite route executes Vite against a planted configuration fault', () => {
    proveRegisteredCheckFalsifies({
      id: 'check/test-vite',
      command: 'pnpm run test:vite',
      control: 'tests/unit/devops/test-vite-negative-control.test.ts',
      ...viteFaultFixture(),
    });
  });
});
