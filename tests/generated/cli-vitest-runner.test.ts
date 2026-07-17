// GENERATED — do not edit by hand
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { decode } from '../../packages/core/src/schema/index.js';
import { schemaToArbitrary } from '../../packages/core/src/harness/arbitrary-from-schema.js';
import { vitestRunnerCapsule } from '../../packages/cli/src/capsules/vitest-runner.js';

describe('cli.vitest-runner', () => {
  const cap = vitestRunnerCapsule;
  // Non-emitted / EXEMPTED checks (documented; deliberately no skipped stand-in):
//  - idempotent / audit receipt: EXEMPTED — 'cli.vitest-runner' declares the
//    TYPED escape hatch `receiptKind: 'effect-outcome'`. Its receipt is
//    the outcome of an effect with no pure core to drive twice, so these
//    checks are recorded as a declared, machine-readable EXEMPTION (a
//    waiver with teeth) rather than emitted real — and deliberately NOT a
//    skip. Declared reason:
//      receipt is the outcome of spawning an external test process (pnpm exec vitest run); exitCode and stderrTail only exist after the process runs and cannot be driven by a pure core. The sole pure shaping (echoing testFiles) is pinned by the test-files-echoed invariant.
//  - fault injection: EXEMPTED — 'cli.vitest-runner' declares the TYPED escape
//    hatch `receiptKind: 'effect-outcome'`; with no pure `mutate` core to
//    drive, declared faults cannot be injected here. Recorded as a
//    declared EXEMPTION (not a skip), reason as above.
  it('contract shape: input and output decode round-trip', () => {
    for (const schema of [cap.input, cap.output]) {
      const arb = schemaToArbitrary(schema as never) as fc.Arbitrary<unknown>;
      // Kernel schemas encode identically to their decoded form (Encoded ≡ Type),
      // so the contract round-trip is a strict decode that returns the sample
      // unchanged. A malformed contract fails RED at `decode`, never a green skip.
      fc.assert(
        fc.property(arb, (value) => {
          const result = decode(schema as never, value);
          expect(result.ok).toBe(true);
          if (result.ok) expect(result.value).toEqual(value);
          return true;
        }),
        { numRuns: 100 },
      );
    }
  });
});
