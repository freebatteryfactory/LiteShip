import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { DIAGNOSTIC_AREAS } from '@liteship/error';
import { defineGate, noBareThrowGate } from '@liteship/gauntlet';

const reserved = new Set<string>([...DIAGNOSTIC_AREAS, 'liteship']);
const namespaceArb = fc
  .stringMatching(/^[a-z][a-z0-9.-]{0,15}$/u)
  .filter((namespace) => !reserved.has(namespace));

describe('downstream gate identity', () => {
  it('admits any valid foreign namespace only with exact owner metadata', () => {
    fc.assert(
      fc.property(namespaceArb, fc.string({ minLength: 1, maxLength: 40 }).filter((owner) => owner.trim() !== ''), (namespace, owner) => {
        const gate = defineGate({
          ...noBareThrowGate,
          id: `${namespace}/probe`,
          extension: { namespace, owner },
        });
        expect(gate.extension).toEqual({ namespace, owner });
      }),
      { seed: 0x1e71e, numRuns: 100 },
    );
  });

  it('refuses missing, mismatched, and reserved extension ownership', () => {
    fc.assert(
      fc.property(namespaceArb, (namespace) => {
        expect(() => defineGate({ ...noBareThrowGate, id: `${namespace}/probe` })).toThrow();
        expect(() =>
          defineGate({
            ...noBareThrowGate,
            id: `${namespace}/probe`,
            extension: { namespace: `${namespace}x`, owner: '@acme/quality' },
          }),
        ).toThrow();
      }),
      { seed: 0x1e71f, numRuns: 100 },
    );

    for (const namespace of reserved) {
      expect(() =>
        defineGate({
          ...noBareThrowGate,
          id: `${namespace}/probe`,
          extension: { namespace, owner: '@acme/quality' },
        }),
      ).toThrow(/reserved LiteShip namespace/);
    }
  });
});
