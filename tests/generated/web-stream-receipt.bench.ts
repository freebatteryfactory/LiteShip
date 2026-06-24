// GENERATED — do not edit by hand
// BENCH-NOT-APPLICABLE: 'web.stream.receipt' declares receiptKind: 'effect-outcome' — its receipt is the outcome of an external effect with no pure core to time. Declared reason: receipt is the outcome of applying a live DOM morph; status (applied/skipped/failed), appliedAt (wall-clock), and morphPath (resolved live target) only exist after the morph effect runs against the current DOM and cannot be derived purely from the stream message.
import { bench, expect } from 'vitest';
import { streamReceiptCapsule } from '../../packages/web/src/capsules/stream-receipt.js';

// TYPED NOT-APPLICABLE bench (see the BENCH-NOT-APPLICABLE marker above + the
// capsule's `benchExemption` manifest record). 'web.stream.receipt' declares the
// `effect-outcome` escape hatch — its receipt is the outcome of an external
// effect with no pure core to time. This is a real PREMISE GUARD with TEETH: it
// asserts the STRUCTURAL absence of a pure `mutate` core. If the capsule ever
// gains one, the guard fails RED, forcing a real `mutate()` bench.
bench('web.stream.receipt — bench not-applicable (premise guard)', () => {
  const cap = streamReceiptCapsule as { _kind?: unknown; mutate?: unknown; receiptKind?: unknown };
  expect(cap._kind).toBe('receiptedMutation');
  expect(cap.mutate).toBeUndefined();
  expect(cap.receiptKind).toBe('effect-outcome');
}, { time: 50 });
