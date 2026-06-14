// GENERATED — do not edit by hand
import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { jsonRpcServerCapsule } from '../../packages/mcp-server/src/jsonrpc.js';
import { schemaToArbitrary, UnsupportedSchemaError } from '../../packages/core/src/harness/arbitrary-from-schema.js';

describe('mcp.jsonrpc-server', () => {
  const cap = jsonRpcServerCapsule;
  let arb: fc.Arbitrary<unknown>;
  let arbError: unknown;
  try {
    arb = schemaToArbitrary(cap.input as never) as fc.Arbitrary<unknown>;
  } catch (err) {
    arbError = err;
  }
  if (arbError !== undefined && !(arbError instanceof UnsupportedSchemaError)) {
    // Only a non-derivable schema is honest-skip material; anything else
    // (a defect in the arbitrary builder, a malformed capsule) must fail.
    throw arbError;
  }
  if (cap.run === undefined || arbError !== undefined) {
    it.skip(
      arbError instanceof UnsupportedSchemaError
        ? `invariants — input schema not arbitrary-derivable (${arbError.message})`
        : 'invariants — capsule has no run handler',
      () => {},
    );
  } else {
    for (const inv of cap.invariants) {
      it(`invariant: ${inv.name}`, () => {
        fc.assert(
          fc.property(arb, (input) => {
            const output = cap.run!(input as never);
            return inv.check(input as never, output as never);
          }),
          { numRuns: 100 },
        );
        // Generous per-invariant timeout: 100 property runs over a heavier capsule
        // (e.g. the cast compilers) can exceed vitest's 10s default on a slow/loaded
        // CI runner (esp. Windows) — give headroom rather than reduce coverage.
      }, 30000);
    }
  }
});
