import { describe } from 'vitest';
import { registerCheckNegativeControl, tailwindFaultFixture } from '../../support/registered-check-negative-control.js';

describe('check/test-tailwind negative control', () => {
  registerCheckNegativeControl('the registered Tailwind route executes the compiler and rejects malformed theme CSS', {
    id: 'check/test-tailwind',
    command: 'pnpm run test:tailwind',
    control: 'tests/unit/devops/test-tailwind-negative-control.test.ts',
    ...tailwindFaultFixture(),
  });
});
