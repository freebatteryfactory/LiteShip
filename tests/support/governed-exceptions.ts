import type { GovernedExceptionSources } from '../../scripts/lib/governed-exceptions.js';

export const GOVERNED_NOW = new Date('2026-07-24T00:00:00.000Z');
export const GOVERNED_EFFECTIVE_DATE = '2026-07-01';
export const GOVERNED_EXPIRY = '2027-01-01';

export function governedExceptionSources(): GovernedExceptionSources {
  const elementKey = 'skip-allowlist::tests/example.test.ts::it.skipIf(!capability)';
  const weakening = 'skip-allowlist-added' as const;
  return {
    standardsWaivers: [
      {
        elementKey,
        weakening,
        owner: 'standards-owner',
        justification: 'The capability-gated body runs on the qualified host.',
        expiry: GOVERNED_EXPIRY,
      },
    ],
    standardsIntegrity: {
      _tag: 'active',
      baseRef: 'fixture-base',
      facts: {
        unsignedWeakenings: [],
        signedWeakenings: [
          {
            elementKey,
            changeClass: 'weaken',
            weakening,
            detail: 'The live capability-gated test is the compensating execution proof.',
            owner: 'standards-owner',
            justification: 'The capability-gated body runs on the qualified host.',
          },
        ],
        unregeneratedStrengthens: [],
        forbiddenSignoffs: [],
        expiredSignoffs: [],
        committedAddress: 'fnv1a:11111111',
        liveAddress: 'fnv1a:22222222',
      },
    },
    traceability: {
      invariants: [
        {
          id: 'INV-FIXTURE',
          law: 'The fixture remains monotonic.',
          level: 'L3',
          category: 'fixture',
          state: {
            _tag: 'waived',
            owner: 'testing-owner',
            justification: 'A broader generated property currently exercises the same transition law.',
            expiry: GOVERNED_EXPIRY,
          },
        },
      ],
      divergences: [],
      ledgerAddress: 'fnv1a:33333333',
    },
    obligations: {
      obligations: [
        {
          id: 'OBL-FIXTURE-DEBT',
          class: 'debt',
          owner: 'obligation-owner',
          reviewBy: GOVERNED_EXPIRY,
          pointer: 'packages/example/src/index.ts',
          note: 'The bounded fallback remains covered while its replacement is scheduled.',
        },
      ],
      markers: [{ file: 'packages/example/src/index.ts', obligationIds: ['OBL-FIXTURE-DEBT'] }],
      divergences: [],
      ledgerAddress: 'fnv1a:44444444',
    },
  };
}
