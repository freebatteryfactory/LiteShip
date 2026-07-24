// @vitest-environment node

import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { projectGovernedExceptions } from '../../scripts/lib/governed-exceptions.js';
import { GOVERNED_EFFECTIVE_DATE, GOVERNED_NOW, governedExceptionSources } from '../support/governed-exceptions.js';

const effectiveDateOf = (): string => GOVERNED_EFFECTIVE_DATE;

describe('governed exception projection properties', () => {
  test('source ordering cannot change normalized view bytes', () => {
    fc.assert(
      fc.property(fc.shuffledSubarray([0, 1, 2, 3], { minLength: 4, maxLength: 4 }), (order) => {
        const sources = governedExceptionSources();
        const obligations = Array.from({ length: 4 }, (_, index) => ({
          ...sources.obligations.obligations[0]!,
          id: `OBL-FIXTURE-${index}`,
          pointer: `packages/example/src/${index}.ts`,
        }));
        const expected = projectGovernedExceptions(
          { ...sources, obligations: { ...sources.obligations, obligations } },
          GOVERNED_NOW,
          effectiveDateOf,
        );
        const actual = projectGovernedExceptions(
          {
            ...sources,
            obligations: { ...sources.obligations, obligations: order.map((index) => obligations[index]!) },
          },
          GOVERNED_NOW,
          effectiveDateOf,
        );
        expect(JSON.stringify(actual)).toBe(JSON.stringify(expected));
      }),
      { seed: 0xe7ce71, numRuns: 80 },
    );
  });

  test('blank required canonical fields never enter the governed view', () => {
    fc.assert(
      fc.property(fc.constantFrom('owner', 'pointer', 'note'), fc.stringMatching(/^\s{0,5}$/), (field, blank) => {
        const sources = governedExceptionSources();
        const original = sources.obligations.obligations[0]!;
        const corrupted = { ...original, [field]: blank };
        expect(() =>
          projectGovernedExceptions(
            { ...sources, obligations: { ...sources.obligations, obligations: [corrupted] } },
            GOVERNED_NOW,
            effectiveDateOf,
          ),
        ).toThrow(/missing (owner|scope|rationale|compensatingProof)/);
      }),
      { seed: 0xb1a0c, numRuns: 90 },
    );
  });

  test('malformed and past expiry dates always fail closed', () => {
    fc.assert(
      fc.property(fc.constantFrom('tomorrow', '2026-13-01', '2026-02-31', '2025-12-31'), (expiry) => {
        const sources = governedExceptionSources();
        const obligations = sources.obligations.obligations.map((record) => ({ ...record, reviewBy: expiry }));
        expect(() =>
          projectGovernedExceptions(
            { ...sources, obligations: { ...sources.obligations, obligations } },
            GOVERNED_NOW,
            effectiveDateOf,
          ),
        ).toThrow(/malformed expiry|impossible expiry|is expired/);
      }),
      { seed: 0xe4012e, numRuns: 80 },
    );
  });
});
