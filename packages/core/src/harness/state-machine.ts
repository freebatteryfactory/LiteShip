/**
 * Harness template for the `stateMachine` assembly arm.
 *
 * With a {@link HarnessContext} the generated test imports the REAL capsule
 * binding and probes its handlers at runtime: when the capsule declares
 * `step` + `initialState`, the test derives a fast-check arbitrary from the
 * input schema (events), drives randomized event sequences from the initial
 * state, asserts every declared invariant after each step, and replays the
 * same sequence twice to prove determinism. When the handlers are absent —
 * or the input schema is not arbitrary-derivable — the test self-reports as
 * `it.skip` rather than a vacuous `() => true` placeholder.
 *
 * @module
 */

import type { CapsuleDef } from '../assembly.js';
import type { HarnessContext, HarnessOutput } from './pure-transform.js';

const DEFAULT_ARBITRARY_IMPORT = '../../packages/core/src/harness/arbitrary-from-schema.js';

/**
 * Generate the test + bench file contents for a `stateMachine` capsule.
 * Without a binding context, emits `it.skip` placeholders naming the
 * missing wiring (factory-wrapped capsules have no importable binding).
 */
export function generateStateMachine(
  cap: CapsuleDef<'stateMachine', unknown, unknown, unknown>,
  ctx: HarnessContext = {},
): HarnessOutput {
  const arbitraryImport = ctx.arbitraryImport ?? DEFAULT_ARBITRARY_IMPORT;

  const benchFile = `// GENERATED — do not edit by hand
import { bench } from 'vitest';

bench('${cap.name}', () => {
  // state-machine step with a canonical event
}, { time: 500 });
`;

  if (ctx.bindingImport === undefined || ctx.bindingName === undefined) {
    const testFile = `// GENERATED — do not edit by hand
import { describe, it } from 'vitest';

describe('${cap.name}', () => {
  it.skip('rejects every illegal transition', () => {
    // TODO(harness): no capsule binding import wired by capsule-compile.
    // Factory-wrapped capsules have no importable binding to probe.
  });

  it.skip('replays deterministically from an event log', () => {
    // TODO(harness): same — no binding wired.
  });

  it.skip('invariant holds across random event paths', () => {
    // TODO(harness): same — no binding wired.
  });
});
`;
    return { testFile, benchFile };
  }

  const testFile = `// GENERATED — do not edit by hand
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ${ctx.bindingName} } from '${ctx.bindingImport}';
import { schemaToArbitrary, UnsupportedSchemaError } from '${arbitraryImport}';

describe('${cap.name}', () => {
  const cap = ${ctx.bindingName};
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
        ? \`state machine — input schema not arbitrary-derivable (\${arbError.message})\`
        : 'state machine — capsule has no step/initialState handlers',
      () => {},
    );
  } else {
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
  }
});
`;

  return { testFile, benchFile };
}
