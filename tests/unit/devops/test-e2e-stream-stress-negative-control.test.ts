import { describe, it } from 'vitest';
import { proveRegisteredCheckRejects } from '../../support/registered-check-negative-control.js';

describe('check/test-e2e-stream-stress negative control', () => {
  it('the registered stream-stress authority blocks on a non-zero result', () => {
    proveRegisteredCheckRejects(
      'check/test-e2e-stream-stress',
      'pnpm run test:e2e:stream-stress',
      'tests/unit/devops/test-e2e-stream-stress-negative-control.test.ts',
    );
  });
});
