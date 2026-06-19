/**
 * bench-marker — the ONE machine-readable convention that distinguishes a
 * generated bench's disposition, so a gate can tell three states apart WITHOUT
 * guessing from the closure body:
 *
 *  1. **REAL** — a generated `.bench.ts` whose `bench(...)` body drives the real
 *     binding (the same hot path the generated test drives) over a presampled
 *     fixture. No marker line. This is a genuine measurement.
 *  2. **TYPED NOT-APPLICABLE** — a generated `.bench.ts` for a capsule with NO
 *     pure, perf-sensitive path (its real behavior is an external effect — a
 *     process spawn, a DOM morph, a not-yet-tickable scene). It carries the
 *     {@link BENCH_NOT_APPLICABLE_MARKER} line as its FIRST source line AND a
 *     `benchExemption` record in `reports/capsule-manifest.json`. Its `bench()`
 *     body is a real PREMISE GUARD — it asserts the structural fact that makes
 *     the operation not-applicable (so the exemption can't silently rot), never
 *     a fabricated measurement of the absent operation.
 *  3. **LAZY PLACEHOLDER** (the banned sin) — a `bench(...)` whose body is
 *     empty/comment-only AND no marker line. A benchmark that measures NOTHING
 *     shipping green: the SAME sin as `it.skip`, one lane over.
 *
 * The marker is deliberately a `//`-comment (not a `bench.skip`, which the
 * plumb-gate already fails on) so a not-applicable bench is a REAL running
 * `bench()` with a guarded body — honest, never silenced.
 *
 * A gate (the human wires it) reads each generated bench file: marker line
 * present + a matching manifest `benchExemption` ⇒ honest TYPED-N/A; no marker
 * + a real (non-comment) `bench()` body ⇒ REAL; no marker + comment-only body
 * ⇒ FAIL (lazy placeholder). The marker and the manifest field MUST agree —
 * one without the other is itself a failure the gate can flag.
 *
 * @module
 */

/**
 * The exact first-line marker a TYPED not-applicable generated bench carries.
 * Format: this literal prefix, a space, then the single-line reason. A gate
 * matches the prefix via {@link BENCH_NOT_APPLICABLE_RE} and reads the reason
 * as the rest of the line; the SAME reason is recorded in the manifest's
 * `benchExemption.reason` for the capsule, so the two are cross-checkable.
 */
export const BENCH_NOT_APPLICABLE_MARKER = '// BENCH-NOT-APPLICABLE:' as const;

/**
 * Anchored matcher for the marker line. Group 1 is the trimmed reason. Anchored
 * to the start of a line (multiline) so it only matches the dedicated marker
 * line, never an incidental mention of the token inside a longer comment.
 */
export const BENCH_NOT_APPLICABLE_RE = /^\/\/ BENCH-NOT-APPLICABLE:[ \t]*(.+)$/m;

/**
 * Build the marker line for a given reason. Collapses whitespace to a single
 * line so the marker is always exactly one source line (the manifest records
 * the same collapsed reason — see `scripts/capsule-compile.ts`).
 */
export function benchNotApplicableMarker(reason: string): string {
  return `${BENCH_NOT_APPLICABLE_MARKER} ${reason.replace(/\s+/g, ' ').trim()}`;
}
