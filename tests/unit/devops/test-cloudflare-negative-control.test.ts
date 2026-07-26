import { describe, it } from 'vitest';
import { astroFaultFixture, proveRegisteredCheckFalsifies } from '../../support/registered-check-negative-control.js';

describe('check/test-cloudflare negative control', () => {
  it('the registered Cloudflare build route reaches its Astro executable owner and rejects a planted config fault', () => {
    proveRegisteredCheckFalsifies({
      id: 'check/test-cloudflare',
      command: 'pnpm run test:cloudflare',
      control: 'tests/unit/devops/test-cloudflare-negative-control.test.ts',
      ...astroFaultFixture(),
    });
  });
});
