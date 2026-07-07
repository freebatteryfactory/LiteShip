// GENERATED — do not edit by hand
import { bench } from 'vitest';
import * as fc from 'fast-check';
import { remotionAdapterCapsule } from '../../packages/remotion/src/capsules/remotion-adapter.js';
import { schemaToArbitrary } from '../../packages/core/src/harness/arbitrary-from-schema.js';
import { CanonicalCbor } from '../../packages/core/src/cbor.js';
import { decode } from '../../packages/canonical/src/cbor-decode.js';

const cap = remotionAdapterCapsule as { output: unknown };
const arb = schemaToArbitrary(cap.output as never) as fc.Arbitrary<unknown>;
const natives = fc.sample(arb, { numRuns: 64, seed: 0x5eed });
let i = 0;

bench(`remotion.video-frame-output — native -> czap -> native round trip`, () => {
  const native = natives[i++ % natives.length];
  decode(CanonicalCbor.encode(native));
}, { time: 500 });
