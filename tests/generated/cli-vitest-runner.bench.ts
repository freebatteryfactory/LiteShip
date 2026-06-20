// GENERATED — do not edit by hand
// BENCH-NOT-APPLICABLE: 'cli.vitest-runner' declares receiptKind: 'effect-outcome' — its receipt is the outcome of an external effect with no pure core to time. Declared reason: receipt is the outcome of spawning an external test process (pnpm exec vitest run); exitCode and stderrTail only exist after the process runs and cannot be driven by a pure core. The sole pure shaping (echoing testFiles) is pinned by the test-files-echoed invariant.
import { bench, expect } from 'vitest';
import { vitestRunnerCapsule } from '../../packages/cli/src/capsules/vitest-runner.js';

// TYPED NOT-APPLICABLE bench (see the BENCH-NOT-APPLICABLE marker above + the
// capsule's `benchExemption` manifest record). 'cli.vitest-runner' declares the
// `effect-outcome` escape hatch — its receipt is the outcome of an external
// effect with no pure core to time. This is a real PREMISE GUARD with TEETH: it
// asserts the STRUCTURAL absence of a pure `mutate` core. If the capsule ever
// gains one, the guard fails RED, forcing a real `mutate()` bench.
bench('cli.vitest-runner — bench not-applicable (premise guard)', () => {
  const cap = vitestRunnerCapsule as { _kind?: unknown; mutate?: unknown; receiptKind?: unknown };
  expect(cap._kind).toBe('receiptedMutation');
  expect(cap.mutate).toBeUndefined();
  expect(cap.receiptKind).toBe('effect-outcome');
}, { time: 50 });
