// GENERATED — do not edit by hand
import { bench } from 'vitest';
import * as fc from 'fast-check';
import { escalationChooseRungCapsule } from '../../packages/core/src/capsules/escalation-choose-rung.js';
import { schemaToArbitrary } from '../../packages/core/src/harness/arbitrary-from-schema.js';

// REAL bench: drive the capsule's `decide` over presampled subjects — the SAME
// binding + arbitrary the generated test drives. capsule:compile resolved this
// subject schema as arbitrary-derivable + `decide` present, so the samples are by
// construction subjects `decide` accepts. Samples are drawn ONCE at module load
// (fixed seed → reproducible) so the timed loop measures `decide`, never fast-check.
const cap = escalationChooseRungCapsule;
const decide = cap.decide!;
const arb = schemaToArbitrary(cap.input as never) as fc.Arbitrary<unknown>;
const subjects = fc.sample(arb, { numRuns: 64, seed: 0x5eed });
let i = 0;

bench(`core.escalation.choose-rung — decide() over canonical subjects`, () => {
  decide(subjects[i++ % subjects.length] as never);
}, { time: 500 });
