import { describe, it } from 'vitest';
import { proveRegisteredCheckRejects } from '../../support/registered-check-negative-control.js';

describe('check/test-cloudflare negative control', () => {
  it('the registered Cloudflare build authority blocks on a non-zero result', () => {
    proveRegisteredCheckRejects(
      'check/test-cloudflare',
      'pnpm run test:cloudflare',
      'tests/unit/devops/test-cloudflare-negative-control.test.ts',
    );
  });
});
