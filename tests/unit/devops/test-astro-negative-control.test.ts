import { describe } from 'vitest';
import { astroFaultFixture, registerCheckNegativeControl } from '../../support/registered-check-negative-control.js';

describe('check/test-astro negative control', () => {
  registerCheckNegativeControl('the registered Astro route executes Astro against a planted configuration fault', {
    id: 'check/test-astro',
    command: 'pnpm run test:astro',
    control: 'tests/unit/devops/test-astro-negative-control.test.ts',
    ...astroFaultFixture(),
  });
});
