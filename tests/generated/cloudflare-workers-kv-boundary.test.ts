// GENERATED — do not edit by hand
import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { cloudflareAdapterCapsule } from '../../packages/cloudflare/src/capsules/cloudflare-adapter.js';
import { schemaToArbitrary } from '../../packages/core/src/harness/arbitrary-from-schema.js';
import { CanonicalCbor } from '../../packages/core/src/cbor.js';
import { decode } from '../../packages/canonical/src/cbor-decode.js';
import { contentAddressOf } from '../../packages/core/src/content-address.js';
import { scaledTimeout } from '../../vitest.shared.js';

describe('cloudflare.workers-kv-boundary', () => {
  // UNIT LANE — pure round-trip equality. The adapter's native <-> czap boundary
  // is its 'input' schema; czap's canonical serialization is the
  // round trip. capsule:compile resolved this schema as arbitrary-derivable, so we
  // sample it via the canonical schemaToArbitrary walker (never a hand-built
  // fixture), encode -> decode through CanonicalCbor, and assert structure is
  // preserved via the canonical contentAddressOf (never a hand-rolled deep-equal).
  // A serialization regression that forks structure breaks the address equality RED.
  const cap = cloudflareAdapterCapsule as { input: unknown };
  const arb = schemaToArbitrary(cap.input as never) as fc.Arbitrary<unknown>;

  it('round-trip equality: native -> czap -> native preserves structure', () => {
    fc.assert(
      fc.property(arb, (native) => {
        const back = decode(CanonicalCbor.encode(native));
        return contentAddressOf(back) === contentAddressOf(native);
      }),
      { numRuns: 100 },
    );
  }, scaledTimeout(30000));
});
