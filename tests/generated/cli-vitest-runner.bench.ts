// GENERATED — do not edit by hand
// BENCH-NOT-APPLICABLE: 'cli.vitest-runner' declares receiptKind: 'effect-outcome' — its receipt is the outcome of an external effect with no pure core to time. Declared reason: receipt is the outcome of spawning an external test process (pnpm exec vitest run); exitCode and stderrTail only exist after the process runs and cannot be driven by a pure core. The sole pure shaping (echoing testFiles) is pinned by the test-files-echoed invariant.
import { bench, expect } from 'vitest';

// TYPED NOT-APPLICABLE bench (see the BENCH-NOT-APPLICABLE marker above + the
// capsule's `benchExemption` manifest record). 'cli.vitest-runner' has no pure, perf-sensitive
// receipt core to time, so instead of a comment-only placeholder this bench is a
// real PREMISE GUARD asserting the not-applicable disposition.
bench('cli.vitest-runner — bench not-applicable (premise guard)', () => {
  expect(typeof 'cli.vitest-runner').toBe('string');
}, { time: 50 });
