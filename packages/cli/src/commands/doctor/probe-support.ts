/**
 * doctor — probe runtime support. The version-string parsers, the discriminated
 * readout constructor, and the per-probe subprocess bound every probe leans on.
 *
 * Split from `types.ts` so the vocabulary file stays fully erasable
 * (types-file-purity): these are runtime values with definition sites.
 * Pure data + parsing only: no fs, no spawn, no world-mutation.
 *
 * @module
 */

/** Construct the `unreadable` arm of a {@link import('./types.js').Readout}. */
export function unreadable(e: unknown): { kind: 'unreadable'; detail: string } {
  return { kind: 'unreadable', detail: e instanceof Error ? e.message : String(e) };
}

export function parseEngineMajor(s: string | undefined): number | null {
  if (!s) return null;
  const m = s.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

/**
 * Per-probe subprocess bound (CUT test-flake). External probes (`pnpm`/`cargo`/`git`/
 * `wrangler`) shell out; under parallel load those spawns can drag past the test
 * timeout. A bound keeps `liteship doctor` deterministic and non-hanging: a slow/wedged
 * tool degrades to a `warn` ("didn't answer in time") instead of blocking forever.
 * Concurrency (see runAllProbes) makes the path "max single probe", not the sum —
 * so 4s is comfortable.
 */
export const DOCTOR_PROBE_TIMEOUT_MS = 4_000;

/** Parse `vMAJOR.MINOR.PATCH` (or `MAJOR.MINOR.PATCH`) into a major-version number. */
export function parseMajor(version: string): number | null {
  const cleaned = version.trim().replace(/^v/, '');
  const [maj] = cleaned.split('.');
  const n = Number(maj);
  return Number.isFinite(n) ? n : null;
}
