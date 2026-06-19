// GENERATED — do not edit by hand
import { bench } from 'vitest';
import * as fc from 'fast-check';
import { shipEmitCapsule } from '../../packages/cli/src/capsules/ship-emit.js';
import { schemaToArbitrary } from '../../packages/core/src/harness/arbitrary-from-schema.js';

// REAL bench: time the capsule's pure `mutate` receipt core over presampled
// inputs — the SAME binding + arbitrary the idempotency/audit checks drive.
// Inputs are presampled once at module load (fixed seed) so the timed loop
// measures `mutate`, never fast-check. `mutate` may be sync or async; awaiting a
// non-promise is a no-op, so this is correct either way.
const cap = shipEmitCapsule;
const mutate = cap.mutate!;
const arb = schemaToArbitrary(cap.input as never) as fc.Arbitrary<unknown>;
const samples = fc.sample(arb, { numRuns: 64, seed: 0x5eed });
let i = 0;

bench(`cli.ship-emit — mutate() over canonical samples`, async () => {
  await mutate(samples[i++ % samples.length] as never);
}, { time: 500 });
