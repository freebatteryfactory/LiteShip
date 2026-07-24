import { describe, it } from 'vitest';
import { proveRegisteredCheckRejects } from '../../support/registered-check-negative-control.js';

describe('check/test-astro negative control', () => {
  it('the registered Astro integration authority blocks on a non-zero result', () => {
    proveRegisteredCheckRejects(
      'check/test-astro',
      'pnpm run test:astro',
      'tests/unit/devops/test-astro-negative-control.test.ts',
    );
  });
});
