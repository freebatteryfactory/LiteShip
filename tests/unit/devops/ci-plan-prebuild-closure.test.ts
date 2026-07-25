/** Clean-checkout execution contract for the pre-build CI planner. @module */

import { describe, expect, it } from 'vitest';
import { forbiddenSourceImportClosure } from '../../../scripts/lib/source-import-contract.js';

describe('CI plan pre-build import closure', () => {
  it('contains no runtime dependency on a built workspace package or dist artifact', () => {
    expect(
      forbiddenSourceImportClosure(process.cwd(), 'scripts/ci-plan.ts', [
        { pattern: /^@liteship\//u, reason: 'workspace runtime package' },
        { pattern: /(?:^|\/)dist(?:\/|$)/u, reason: 'built output' },
      ]),
    ).toEqual([]);
  });
});
