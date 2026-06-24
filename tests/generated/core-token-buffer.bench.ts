// GENERATED — do not edit by hand
import { bench } from 'vitest';
import * as fc from 'fast-check';
import { tokenBufferCapsule } from '../../packages/core/src/capsules/token-buffer.js';
import { schemaToArbitrary } from '../../packages/core/src/harness/arbitrary-from-schema.js';

// REAL bench: drive the capsule's `step` over presampled events — the SAME
// binding + arbitrary the generated test drives. The seed state is cloned per
// iteration (step may mutate-and-return its state), and events are presampled
// once at module load so the timed loop measures `step`, never fast-check.
const cap = tokenBufferCapsule;
const step = cap.step!;
const arb = schemaToArbitrary(cap.input as never) as fc.Arbitrary<unknown>;
const events = fc.sample(arb, { numRuns: 64, seed: 0x5eed });
let i = 0;

bench(`core.token-buffer — step() over canonical events`, () => {
  const state = structuredClone(cap.initialState!);
  step(state as never, events[i++ % events.length] as never);
}, { time: 500 });
