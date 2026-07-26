import { describe, it } from 'vitest';
import { astroFaultFixture, proveRegisteredCheckFalsifies } from '../../support/registered-check-negative-control.js';

describe('check/test-astro negative control', () => {
  it('the registered Astro route executes Astro against a planted configuration fault', () => {
    proveRegisteredCheckFalsifies({
      id: 'check/test-astro',
      command: 'pnpm run test:astro',
      control: 'tests/unit/devops/test-astro-negative-control.test.ts',
      ...astroFaultFixture(),
    });
  });
});
