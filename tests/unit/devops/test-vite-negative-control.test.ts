import { describe, it } from 'vitest';
import { proveRegisteredCheckRejects } from '../../support/registered-check-negative-control.js';

describe('check/test-vite negative control', () => {
  it('the registered Vite integration authority blocks on a non-zero result', () => {
    proveRegisteredCheckRejects(
      'check/test-vite',
      'pnpm run test:vite',
      'tests/unit/devops/test-vite-negative-control.test.ts',
    );
  });
});
