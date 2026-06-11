// GENERATED — do not edit by hand
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { introBed } from '../../examples/scenes/assets.js';
import { schemaToArbitrary, UnsupportedSchemaError } from '../../packages/core/src/harness/arbitrary-from-schema.js';

describe('intro-bed', () => {
  const cap = introBed;
  let sourceArb: fc.Arbitrary<unknown>;
  let arbError: unknown;
  try {
    sourceArb = schemaToArbitrary(cap.input as never) as fc.Arbitrary<unknown>;
  } catch (err) {
    arbError = err;
  }
  if (arbError !== undefined && !(arbError instanceof UnsupportedSchemaError)) {
    // Only a non-derivable schema is honest-skip material; anything else
    // (a defect in the arbitrary builder, a malformed capsule) must fail.
    throw arbError;
  }
  if (cap.derive === undefined || arbError !== undefined) {
    it.skip(
      arbError instanceof UnsupportedSchemaError
        ? `projection — input schema not arbitrary-derivable (${arbError.message})`
        : 'projection — capsule has no derive handler',
      () => {},
    );
  } else {
    const derive = cap.derive!;

    it('determinism: identical source derives a deep-equal output', async () => {
      await fc.assert(
        fc.asyncProperty(sourceArb, async (source) => {
          expect(await derive(source as never)).toEqual(await derive(source as never));
        }),
        { numRuns: 100 },
      );
    });

    for (const inv of cap.invariants) {
      it(`invariant: ${inv.name}`, async () => {
        await fc.assert(
          fc.asyncProperty(sourceArb, async (source) => {
            const output = await derive(source as never);
            return inv.check(source as never, output as never);
          }),
          { numRuns: 100 },
        );
      });
    }
  }

  // Canonical-fixture probes — real bytes through the real decoder.
  const fixtureAbs = resolve('examples/scenes/intro-bed.wav');
  if (cap.derive === undefined || !existsSync(fixtureAbs)) {
    it.skip(
      cap.derive === undefined
        ? 'canonical fixture decode — capsule has no derive handler'
        : `canonical fixture decode — fixture missing at ${fixtureAbs} (restore examples/scenes/intro-bed.wav and re-run pnpm run capsule:compile)`,
      () => {},
    );
  } else {
    const derive = cap.derive!;
    const fixtureBytes = (): ArrayBuffer => readFileSync(fixtureAbs).buffer as ArrayBuffer;

    it('determinism: the canonical fixture decodes to a deep-equal output twice', async () => {
      expect(await derive(fixtureBytes() as never)).toEqual(await derive(fixtureBytes() as never));
    });

    for (const inv of cap.invariants) {
      it(`invariant over canonical fixture: ${inv.name}`, async () => {
        const source = fixtureBytes();
        const output = await derive(source as never);
        expect(inv.check(source as never, output as never)).toBe(true);
      });
    }
  }
});
