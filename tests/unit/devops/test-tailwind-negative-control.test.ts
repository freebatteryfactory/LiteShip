import { describe, it } from 'vitest';
import { proveRegisteredCheckRejects } from '../../support/registered-check-negative-control.js';

describe('check/test-tailwind negative control', () => {
  it('the registered Tailwind integration authority blocks on a non-zero result', () => {
    proveRegisteredCheckRejects(
      'check/test-tailwind',
      'pnpm run test:tailwind',
      'tests/unit/devops/test-tailwind-negative-control.test.ts',
    );
  });
});
