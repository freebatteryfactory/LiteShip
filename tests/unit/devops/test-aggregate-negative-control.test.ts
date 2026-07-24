import { describe, it } from 'vitest';
import { proveRegisteredCheckRejects } from '../../support/registered-check-negative-control.js';

describe('check/test negative control', () => {
  it('the registered aggregate-test authority blocks on a non-zero result', () => {
    proveRegisteredCheckRejects('check/test', 'pnpm test', 'tests/unit/devops/test-aggregate-negative-control.test.ts');
  });
});
