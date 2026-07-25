/** Name-normalization properties for the public scaffolder. */

import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { projectNameFromDir } from '../../packages/create-liteship/src/index.js';

describe('create-liteship project-name normalization', () => {
  test('always emits a non-empty lowercase npm-safe name and is idempotent', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 120 }), (authored) => {
        const projected = projectNameFromDir(authored);
        expect(projected).toMatch(/^[a-z0-9~][a-z0-9._~-]*$/u);
        expect(projected).toBe(projected.toLowerCase());
        expect(projectNameFromDir(projected)).toBe(projected);
      }),
      { seed: 0x5eed_1814, numRuns: 500 },
    );
  });

  test('different platform separators cannot survive as package-name syntax', () => {
    fc.assert(
      fc.property(
        fc.array(fc.stringMatching(/^[A-Za-z0-9 _!@#$%^&()+={}]{1,12}$/u), { minLength: 1, maxLength: 6 }),
        (parts) => {
          for (const authored of [parts.join('/'), parts.join('\\')]) {
            const projected = projectNameFromDir(authored);
            expect(projected).not.toMatch(/[\\/]/u);
            expect(projected).toMatch(/^[a-z0-9~][a-z0-9._~-]*$/u);
          }
        },
      ),
      { seed: 0x5eed_1815, numRuns: 300 },
    );
  });
});
