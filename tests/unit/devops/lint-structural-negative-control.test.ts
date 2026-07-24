import { describe, it } from 'vitest';
import { proveRegisteredCheckRejects } from '../../support/registered-check-negative-control.js';

describe('check/lint-structural negative control', () => {
  it('the registered structural-lint authority blocks on a non-zero result', () => {
    proveRegisteredCheckRejects(
      'check/lint-structural',
      'pnpm run lint:structural',
      'tests/unit/devops/lint-structural-negative-control.test.ts',
    );
  });
});
