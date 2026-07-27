import { describe } from 'vitest';
import { astroFaultFixture, registerCheckNegativeControl } from '../../support/registered-check-negative-control.js';

describe('check/test-cloudflare negative control', () => {
  registerCheckNegativeControl(
    'the registered Cloudflare build route reaches its Astro executable owner and rejects a planted config fault',
    {
      id: 'check/test-cloudflare',
      command: 'pnpm run test:cloudflare',
      control: 'tests/unit/devops/test-cloudflare-negative-control.test.ts',
      ...astroFaultFixture(),
    },
  );
});
