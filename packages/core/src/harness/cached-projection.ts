/**
 * Harness template for the `cachedProjection` assembly arm.
 *
 * With a {@link HarnessContext} the generated test imports the REAL capsule
 * binding and probes its `derive(source)` handler at runtime: determinism
 * (the same source derives a deep-equal output twice — the property a
 * content-addressed cache is allowed to rely on) and every declared
 * invariant under random sources. When `derive` is absent — or the input
 * schema is not arbitrary-derivable — the test self-reports as `it.skip`
 * rather than a vacuous placeholder.
 *
 * @module
 */

import type { CapsuleDef } from '../assembly.js';
import type { HarnessContext, HarnessOutput } from './pure-transform.js';

const DEFAULT_ARBITRARY_IMPORT = '../../packages/core/src/harness/arbitrary-from-schema.js';

/**
 * Generate the test + bench file contents for a `cachedProjection` capsule.
 * Without a binding context, emits `it.skip` placeholders naming the
 * missing wiring (factory-wrapped capsules have no importable binding).
 */
export function generateCachedProjection(
  cap: CapsuleDef<'cachedProjection', unknown, unknown, unknown>,
  ctx: HarnessContext = {},
): HarnessOutput {
  const arbitraryImport = ctx.arbitraryImport ?? DEFAULT_ARBITRARY_IMPORT;

  const benchFile = `// GENERATED — do not edit by hand
import { bench } from 'vitest';

bench('${cap.name} — decode throughput', () => {
  // decode a canonical source, measure p95 vs budget (${cap.budgets.p95Ms ?? 'n/a'}ms)
}, { time: 500 });
`;

  if (ctx.bindingImport === undefined || ctx.bindingName === undefined) {
    const testFile = `// GENERATED — do not edit by hand
import { describe, it } from 'vitest';

describe('${cap.name}', () => {
  it.skip('cache hit: identical source yields the same derived output', () => {
    // TODO(harness): no capsule binding import wired by capsule-compile.
    // Factory-wrapped capsules have no importable binding to probe.
  });

  it.skip('invalidation: source change produces new cache entry', () => {
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
  let sourceArb: fc.Arbitrary<unknown>;
  let arbError: unknown;
  try {
    sourceArb = schemaToArbitrary(cap.input as never) as fc.Arbitrary<unknown>;
  } catch (err) {
    arbError = err;
  }
  if (arbError !== undefined && !(arbError instanceof UnsupportedSchemaError)) {
    // Only a non-derivable schema is honest-skip material; anything else
    // (a defect in the arbitrary builder, a malformed capsule) must fail.
    throw arbError;
  }
  if (cap.derive === undefined || arbError !== undefined) {
    it.skip(
      arbError instanceof UnsupportedSchemaError
        ? \`projection — input schema not arbitrary-derivable (\${arbError.message})\`
        : 'projection — capsule has no derive handler',
      () => {},
    );
  } else {
    const derive = cap.derive!;

    it('determinism: identical source derives a deep-equal output', () => {
      fc.assert(
        fc.property(sourceArb, (source) => {
          expect(derive(source as never)).toEqual(derive(source as never));
        }),
        { numRuns: 100 },
      );
    });

    for (const inv of cap.invariants) {
      it(\`invariant: \${inv.name}\`, () => {
        fc.assert(
          fc.property(sourceArb, (source) => {
            const output = derive(source as never);
            return inv.check(source as never, output as never);
          }),
          { numRuns: 100 },
        );
      });
    }
  }
});
`;

  return { testFile, benchFile };
}
