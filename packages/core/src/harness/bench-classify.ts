/**
 * bench-classify — the shared classifier for generated `.bench.ts` files, the
 * sibling of {@link BENCH_NOT_APPLICABLE_RE}'s marker convention. It answers two
 * questions a bench-honesty gate (`capsule-verify`) must ask of EVERY generated
 * bench, and is the ONE definition of those answers so the gate and its tests
 * never drift:
 *
 *  - {@link classifyBenchSource}: does at least one `bench(...)` closure contain
 *    executable code ('real'), or is every body empty/comment-only ('placeholder')?
 *  - {@link benchHonestyError}: is this bench HONEST — a real measurement, or a
 *    typed not-applicable exemption (marker line + premise-guard body + a matching
 *    manifest `benchExemption`) — or a banned lazy placeholder / marker↔manifest
 *    drift?
 *
 * It lives in `@czap/core/harness` (next to `bench-marker.ts`, whose
 * `BENCH_NOT_APPLICABLE_RE` it consumes) rather than in a loose script, so the
 * capsule-verify gate, its unit test, and its integration test all share one
 * source of "real vs placeholder vs typed-N/A".
 *
 * @module
 */
import { BENCH_NOT_APPLICABLE_RE } from './bench-marker.js';

/**
 * Classify a generated bench file: 'real' if at least one `bench(...)`
 * closure contains executable code, 'placeholder' if every closure body is
 * empty or comment-only (or no bench call exists at all).
 *
 * The lazy body capture stops at the first `}`, so a real body with nested
 * braces is truncated — but the truncated prefix is still non-empty, which
 * is all the classification needs.
 */
export function classifyBenchSource(source: string): 'real' | 'placeholder' {
  const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const closures = [...stripped.matchAll(/\bbench\s*\([\s\S]*?=>\s*\{([\s\S]*?)\}/g)];
  if (closures.length === 0) return 'placeholder';
  return closures.some((m) => m[1]!.trim().length > 0) ? 'real' : 'placeholder';
}

/**
 * Honesty verdict for ONE generated bench — the ONE definition the gate
 * (capsule-verify) and its meta-test share. Returns a human-readable error for a
 * BANNED disposition, or `null` when the bench is honest. Four states:
 *  - **REAL** — a genuine measurement: a non-comment `bench()` body, no marker,
 *    no manifest exemption → honest (`null`).
 *  - **TYPED NOT-APPLICABLE** — the `// BENCH-NOT-APPLICABLE: <reason>` marker
 *    line + a real premise-guard body (so it classifies 'real') + a manifest
 *    `benchExemption` whose reason MATCHES → honest (`null`).
 *  - **LAZY PLACEHOLDER** (banned) — a comment-only body that measures nothing:
 *    the bench analogue of `it.skip`.
 *  - **MISMATCH** (banned) — marker without manifest record, manifest record
 *    without marker, or disagreeing reasons: silent drift.
 */
export function benchHonestyError(
  capName: string,
  benchSource: string,
  benchExemption: { readonly reason: string } | undefined,
): string | null {
  const markerReason = BENCH_NOT_APPLICABLE_RE.exec(benchSource)?.[1]?.trim();
  const hasExemption = benchExemption !== undefined;
  if (classifyBenchSource(benchSource) === 'placeholder') {
    return (
      `bench for ${capName} measures nothing (comment-only, no premise guard) — make it a REAL ` +
      `measurement, or a typed not-applicable bench (a '// BENCH-NOT-APPLICABLE: <reason>' marker ` +
      `line + a real premise-guard body + a manifest benchExemption)`
    );
  }
  if (markerReason !== undefined && !hasExemption) {
    return `bench for ${capName} has a BENCH-NOT-APPLICABLE marker but no manifest benchExemption record`;
  }
  if (markerReason === undefined && hasExemption) {
    return `bench for ${capName} has a manifest benchExemption but no BENCH-NOT-APPLICABLE marker line`;
  }
  if (markerReason !== undefined && hasExemption && markerReason !== benchExemption.reason) {
    return `bench for ${capName}: BENCH-NOT-APPLICABLE marker reason disagrees with the manifest benchExemption reason`;
  }
  return null;
}
