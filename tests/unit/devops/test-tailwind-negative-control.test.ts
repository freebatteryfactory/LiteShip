import { describe, it } from 'vitest';
import {
  proveRegisteredCheckFalsifies,
  tailwindFaultFixture,
} from '../../support/registered-check-negative-control.js';

describe('check/test-tailwind negative control', () => {
  it('the registered Tailwind route executes the compiler and rejects malformed theme CSS', () => {
    proveRegisteredCheckFalsifies({
      id: 'check/test-tailwind',
      command: 'pnpm run test:tailwind',
      control: 'tests/unit/devops/test-tailwind-negative-control.test.ts',
      ...tailwindFaultFixture(),
    });
  });
});
