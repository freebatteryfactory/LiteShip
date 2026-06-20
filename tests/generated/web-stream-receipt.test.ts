// GENERATED — do not edit by hand
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Schema } from 'effect';
import { schemaToArbitrary } from '../../packages/core/src/harness/arbitrary-from-schema.js';
import { streamReceiptCapsule } from '../../packages/web/src/capsules/stream-receipt.js';

describe('web.stream.receipt', () => {
  const cap = streamReceiptCapsule;
  // Non-emitted / EXEMPTED checks (documented; deliberately no skipped stand-in):
//  - idempotent / audit receipt: EXEMPTED — 'web.stream.receipt' declares the
//    TYPED escape hatch `receiptKind: 'effect-outcome'`. Its receipt is
//    the outcome of an effect with no pure core to drive twice, so these
//    checks are recorded as a declared, machine-readable EXEMPTION (a
//    waiver with teeth) rather than emitted real — and deliberately NOT a
//    skip. Declared reason:
//      receipt is the outcome of applying a live DOM morph; status (applied/skipped/failed), appliedAt (wall-clock), and morphPath (resolved live target) only exist after the morph effect runs against the current DOM and cannot be derived purely from the stream message.
//  - fault injection: EXEMPTED — 'web.stream.receipt' declares the TYPED escape
//    hatch `receiptKind: 'effect-outcome'`; with no pure `mutate` core to
//    drive, declared faults cannot be injected here. Recorded as a
//    declared EXEMPTION (not a skip), reason as above.
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
