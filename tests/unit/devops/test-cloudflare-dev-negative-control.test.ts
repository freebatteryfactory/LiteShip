import { describe, it } from 'vitest';
import { astroFaultFixture, proveRegisteredCheckFalsifies } from '../../support/registered-check-negative-control.js';

describe('check/test-cloudflare-dev negative control', () => {
  it('the registered Cloudflare dev route reaches its Astro executable owner and rejects a planted config fault', () => {
    proveRegisteredCheckFalsifies({
      id: 'check/test-cloudflare-dev',
      command: 'pnpm run test:cloudflare-dev',
      control: 'tests/unit/devops/test-cloudflare-dev-negative-control.test.ts',
      ...astroFaultFixture(),
    });
  });
});
