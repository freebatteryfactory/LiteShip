// GENERATED — do not edit by hand
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Schema } from 'effect';
import { schemaToArbitrary } from '../../packages/core/src/harness/arbitrary-from-schema.js';
import { streamReceiptCapsule } from '../../packages/web/src/capsules/stream-receipt.js';

describe('web.stream.receipt', () => {
  const cap = streamReceiptCapsule;
  // Non-emitted checks (documented; deliberately no skipped placeholder):
//  - idempotent / audit receipt: NOT EMITTED — 'web.stream.receipt' exposes no
//    typed `mutate` invocation channel. A receipted mutation's real
//    behavior here is an external side effect (fs write / process spawn /
//    DOM morph) wired behind a separate runtime callable, not a pure
//    handler the harness may drive twice. There is nothing to invoke, so
//    there is no receipt to compare or inspect — non-emission, not a
//    skip. The receipt CONTRACT is still proven by the round-trip above.
//  - fault injection: NOT EMITTED — 'web.stream.receipt' declares no `faults`
//    table, so there are no faults to prove reachable. A fault-injection
//    test over zero declared faults would be vacuous; non-emission is the
//    honest disposition (add a `faults` entry to enable the check).
  it('contract shape: input and output decode/encode round-trip', () => {
    for (const schema of [cap.input, cap.output]) {
      const arb = schemaToArbitrary(schema as never) as fc.Arbitrary<unknown>;
      const encode = Schema.encodeSync(schema as never);
      const decode = Schema.decodeUnknownSync(schema as never);
      fc.assert(
        fc.property(arb, (value) => {
          expect(decode(encode(value as never))).toEqual(value);
          return true;
        }),
        { numRuns: 100 },
      );
    }
  });
});
