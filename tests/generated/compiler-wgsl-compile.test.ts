// GENERATED — do not edit by hand
import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { wgslCompileCapsule } from '../../packages/compiler/src/capsules/wgsl-compile.js';
import { schemaToArbitrary } from '../../packages/core/src/harness/arbitrary-from-schema.js';
import { scaledTimeout } from '../../vitest.shared.js';

describe('compiler.wgsl-compile', () => {
  const cap = wgslCompileCapsule;
  // Resolved arbitrary-derivable + run handler present at capsule:compile.
  const arb = schemaToArbitrary(cap.input as never) as fc.Arbitrary<unknown>;
  const run = cap.run!;

  for (const inv of cap.invariants) {
    it(`invariant: ${inv.name}`, () => {
      fc.assert(
        fc.property(arb, (input) => {
          const output = run(input as never);
          return inv.check(input as never, output as never);
        }),
        { numRuns: 100 },
      );
      // Generous per-invariant timeout: 100 property runs over a heavier capsule
      // (e.g. the cast compilers) can exceed vitest's 10s default on a slow/loaded
      // CI runner (esp. Windows) — give headroom rather than reduce coverage.
      // scaledTimeout keeps the repo's central CI-scaling policy (no raw literals).
    }, scaledTimeout(30000));
  }
});
