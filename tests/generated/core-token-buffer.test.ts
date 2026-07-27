// GENERATED — do not edit by hand
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { tokenBufferCapsule } from '../../packages/core/src/authoring/capsules/token-buffer.js';
import { schemaToArbitrary } from '../../packages/core/src/harness/arbitrary-from-schema.js';

describe('core.token-buffer', () => {
  const cap = tokenBufferCapsule;
  // Resolved arbitrary-derivable + step/initialState present at capsule:compile.
  const eventArb = schemaToArbitrary(cap.input as never) as fc.Arbitrary<unknown>;
  const step = cap.step!;
  // The contract's step(state, event) signature permits implementations
  // that mutate and return their state object — a shared seed would let
  // one fast-check case contaminate the next. Clone the seed per fold.
  const seedState = (): unknown => structuredClone(cap.initialState!);

  it('invariants hold after every step across random event paths', () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 50 }), (events) => {
        let state = seedState();
        for (const event of events) {
          state = step(state as never, event as never);
          for (const inv of cap.invariants) {
            if (!inv.check(event as never, state as never)) return false;
          }
        }
        return true;
      }),
      { numRuns: 100 },
    );
  });

  it('replays deterministically from an event log', () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 50 }), (events) => {
        const replay = (): unknown =>
          events.reduce((state, event) => step(state as never, event as never), seedState());
        expect(replay()).toEqual(replay());
      }),
      { numRuns: 50 },
    );
  });
});
