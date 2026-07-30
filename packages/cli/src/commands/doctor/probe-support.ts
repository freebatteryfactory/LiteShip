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
 * Concurrency (see runAllProbes) makes the path "max single probe", not the sum.
 *
 * 20s: scheduled runs 30342905791 (Jul 28) and 30526718746 (Jul 30) BOTH measured
 * `cargo --version` killed at the prior 4s bound on the contended cron runner
 * (rustup's shim resolves a toolchain on first invocation), and strict preflight
 * folded the warn into a whole-lane failure — twice-measured valid work, the only
 * sanctioned reason to raise a budget. A genuinely MISSING tool still fails fast
 * (spawn ENOENT, not a timeout), so the ceiling only bites when the tool is
 * present-but-slow — exactly the case that must degrade to warn, not kill the lane.
 */
export const DOCTOR_PROBE_TIMEOUT_MS = 20_000;

/** Parse `vMAJOR.MINOR.PATCH` (or `MAJOR.MINOR.PATCH`) into a major-version number. */
export function parseMajor(version: string): number | null {
  const cleaned = version.trim().replace(/^v/, '');
  const [maj] = cleaned.split('.');
  const n = Number(maj);
  return Number.isFinite(n) ? n : null;
}
