/**
 * The BYTE-EXACT TRACE + its content-addressed DIGEST — the scenario's identity.
 *
 * A {@link SimTrace} is the ordered record of every observable effect a scenario
 * produced (one {@link TraceEntry} per step outcome), plus the seed it ran from.
 * Its DIGEST ({@link traceDigest}) is minted through the ONE content-addressing
 * kernel (`canonicalize → CanonicalCbor → fnv1a`, via {@link contentAddressOf}) —
 * reused, never forked — so the trace's address IS the scenario's identity. Two
 * runs whose observable effects are byte-identical produce the SAME digest; one
 * differing byte (a leaked real-time read, an ordering flip) produces a DIFFERENT
 * digest. That equality/inequality is the entire replay property.
 *
 * VOLATILE-FIELD STRIPPING (the `resultId-excludes-timestamp` discipline): the
 * digest is computed over the entries' ORDERED `(label, value)` observations and
 * the seed ONLY. It deliberately EXCLUDES any wall-time the trace might carry for
 * human display — the same way a `resultId` excludes its `generatedAt` timestamp
 * — because a digest that folded a real timestamp would never replay equal. Here
 * the world's clocks are fixed, so even an OBSERVED clock value is deterministic
 * and MAY be part of a `value`; what `traceDigest` strips is the trace's own
 * envelope metadata (a display-only `capturedAtLabel`), never the observations.
 *
 * @module
 */

import type { ContentAddress } from '../brands.js';
import { contentAddressOf } from '../content-address.js';
import type { StepOutcome } from './scheduler.js';

/**
 * One observed effect in the trace — a step's `(label, value)` outcome. The
 * `value` is whatever the step observed (a quantizer index, a graph-patch result,
 * a faulted/dropped marker), content-addressed verbatim. Ordered position in the
 * trace's `entries` is load-bearing — reordering is a divergence.
 */
export interface TraceEntry {
  /** The injection/observation point this effect was emitted at. */
  readonly label: string;
  /** The deterministic observed value — content-addressed into the digest. */
  readonly value: unknown;
}

/**
 * The byte-exact trace — the ordered observable effects of one scenario run plus
 * the seed it ran from. A DATA record (composition, no class). Its identity is
 * {@link traceDigest}; `seed` is carried so a failing trace replays from it (the
 * FoundationDB property). `capturedAtLabel` is a DISPLAY-ONLY envelope note that
 * the digest deliberately ignores (volatile-field stripping).
 */
export interface SimTrace {
  /** The seed the run was minted from — a failure's reproducible identity. */
  readonly seed: number;
  /** The ordered observable effects — the load-bearing content. */
  readonly entries: readonly TraceEntry[];
  /**
   * A display-only note (e.g. a human label for when the trace was captured). NOT
   * folded into {@link traceDigest} — included so the trace is self-describing for
   * a human without polluting its identity. Optional.
   */
  readonly capturedAtLabel?: string;
}

/**
 * Build a {@link SimTrace} from the scheduler's observed outcomes. Pure: a direct
 * projection of `(label, value)` in observed order, plus the seed. No clock, no
 * rng, no IO — the trace is exactly what the run observed.
 */
export function buildTrace(seed: number, outcomes: readonly StepOutcome[], capturedAtLabel?: string): SimTrace {
  return {
    seed,
    entries: outcomes.map((o) => ({ label: o.label, value: o.value })),
    ...(capturedAtLabel !== undefined ? { capturedAtLabel } : {}),
  };
}

/**
 * The trace's content address — its identity, minted through the ONE kernel
 * ({@link contentAddressOf}: canonicalize → CanonicalCbor → fnv1a). Folds the
 * seed and the ORDERED `(label, value)` observations; STRIPS the display-only
 * `capturedAtLabel` envelope (volatile-field discipline) so two runs differing
 * only in that human note still address equal. Byte-identical observations in the
 * same order ⇒ identical address; any divergence ⇒ a different address. This
 * equality is the replay assertion.
 */
export function traceDigest(trace: SimTrace): ContentAddress {
  // The identity payload — explicitly the seed + ordered observations, NOTHING
  // else. Written as a literal so the canonical-identity guard sees identity is
  // paired with the kernel, and so the volatile `capturedAtLabel` is provably
  // excluded (it is simply not referenced here).
  const identityPayload = {
    seed: trace.seed,
    entries: trace.entries.map((entry) => ({ label: entry.label, value: entry.value })),
  };
  return contentAddressOf(identityPayload);
}

/**
 * Whether two traces have the SAME identity (byte-exact replay holds). True iff
 * their digests are equal. The one predicate the replay assertion and the DST
 * gate both read through, so "are these the same run?" has ONE answer everywhere.
 */
export function tracesAgree(a: SimTrace, b: SimTrace): boolean {
  return traceDigest(a) === traceDigest(b);
}
