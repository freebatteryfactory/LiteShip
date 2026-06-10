// GENERATED — do not edit by hand
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { sceneRuntimeCapsule } from '../../packages/scene/src/runtime.js';
import { schemaToArbitrary, UnsupportedSchemaError } from '../../packages/core/src/harness/arbitrary-from-schema.js';

describe('scene.runtime', () => {
  const cap = sceneRuntimeCapsule;
  let eventArb: fc.Arbitrary<unknown>;
  let arbError: unknown;
  try {
    eventArb = schemaToArbitrary(cap.input as never) as fc.Arbitrary<unknown>;
  } catch (err) {
    arbError = err;
  }
  if (arbError !== undefined && !(arbError instanceof UnsupportedSchemaError)) {
    // Only a non-derivable schema is honest-skip material; anything else
    // (a defect in the arbitrary builder, a malformed capsule) must fail.
    throw arbError;
  }
  if (cap.step === undefined || cap.initialState === undefined || arbError !== undefined) {
    it.skip(
      arbError instanceof UnsupportedSchemaError
        ? `state machine — input schema not arbitrary-derivable (${arbError.message})`
        : 'state machine — capsule has no step/initialState handlers',
      () => {},
    );
  } else {
    const step = cap.step!;
    const initialState = cap.initialState!;

    it('invariants hold after every step across random event paths', () => {
      fc.assert(
        fc.property(fc.array(eventArb, { maxLength: 50 }), (events) => {
          let state = initialState;
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
            events.reduce((state, event) => step(state as never, event as never), initialState as unknown);
          expect(replay()).toEqual(replay());
        }),
        { numRuns: 50 },
      );
    });
  }
});
