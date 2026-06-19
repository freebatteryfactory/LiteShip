// GENERATED — do not edit by hand
import { bench } from 'vitest';
import * as fc from 'fast-check';
import { escalationChooseRungCapsule } from '../../packages/core/src/capsules/escalation-choose-rung.js';
import { schemaToArbitrary } from '../../packages/core/src/harness/arbitrary-from-schema.js';

// REAL bench: drive the capsule's `run` over presampled inputs — the SAME
// binding + arbitrary the generated test drives. capsule:compile resolved this
// input as arbitrary-derivable + `run` present, so the samples are by
// construction inputs `run` accepts. The samples are drawn ONCE at module load
// (fixed seed → reproducible) so the timed loop measures `run`, never fast-check.
const cap = escalationChooseRungCapsule;
const run = cap.run!;
const arb = schemaToArbitrary(cap.input as never) as fc.Arbitrary<unknown>;
const samples = fc.sample(arb, { numRuns: 64, seed: 0x5eed });
let i = 0;

bench(`core.escalation.choose-rung — run() over canonical samples`, () => {
  // Cycle through the presampled batch; one real handler invocation per iteration.
  run(samples[i++ % samples.length] as never);
}, { time: 500 });
