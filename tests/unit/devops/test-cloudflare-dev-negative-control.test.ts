import { describe, it } from 'vitest';
import { proveRegisteredCheckRejects } from '../../support/registered-check-negative-control.js';

describe('check/test-cloudflare-dev negative control', () => {
  it('the registered Cloudflare dev authority blocks on a non-zero result', () => {
    proveRegisteredCheckRejects(
      'check/test-cloudflare-dev',
      'pnpm run test:cloudflare-dev',
      'tests/unit/devops/test-cloudflare-dev-negative-control.test.ts',
    );
  });
});
