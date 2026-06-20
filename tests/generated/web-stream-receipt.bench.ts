// GENERATED — do not edit by hand
// BENCH-NOT-APPLICABLE: 'web.stream.receipt' declares receiptKind: 'effect-outcome' — its receipt is the outcome of an external effect with no pure core to time. Declared reason: receipt is the outcome of applying a live DOM morph; status (applied/skipped/failed), appliedAt (wall-clock), and morphPath (resolved live target) only exist after the morph effect runs against the current DOM and cannot be derived purely from the stream message.
import { bench, expect } from 'vitest';

// TYPED NOT-APPLICABLE bench (see the BENCH-NOT-APPLICABLE marker above + the
// capsule's `benchExemption` manifest record). 'web.stream.receipt' has no pure, perf-sensitive
// receipt core to time, so instead of a comment-only stand-in this bench is a
// real PREMISE GUARD asserting the not-applicable disposition.
bench('web.stream.receipt — bench not-applicable (premise guard)', () => {
  expect(typeof 'web.stream.receipt').toBe('string');
}, { time: 50 });
