/**
 * doctor — shared vocabulary. The probe-result types (status/verdict/check/
 * fix/receipt/target), the discriminated {@link Readout} for environment
 * file probes, and the version-string parsers every probe leans on.
 *
 * Pure data + parsing only: no fs, no spawn, no world-mutation. The whole
 * doctor module graph depends downward onto this leaf.
 *
 * @module
 */

import type { WallClockTimestamp } from '../../receipts.js';

/** Status for a single environment probe. */
export type DoctorBearing = 'ok' | 'warn' | 'fail';

/** Overall environment readiness. Aggregates the per-check statuses. */
export type DoctorVerdict = 'ready' | 'caution' | 'blocked';

/** Host deployment target for focused probe profiles. */
export type DoctorTarget = 'cloudflare' | 'astro' | 'consumer-app';

/** One probe outcome. */
export interface DoctorCheck {
  readonly id: string;
  readonly label: string;
  readonly status: DoctorBearing;
  readonly detail: string;
  readonly hint?: string;
  /** Whether `doctor --fix` knows how to remediate this check. */
  readonly fixable?: boolean;
}

/** One applied fix, recorded in the receipt. */
export interface DoctorFix {
  readonly id: string;
  readonly action: string;
  readonly status: 'applied' | 'failed';
  readonly detail?: string;
}

/**
 * Discriminated read result for environment probes. Doctor's one job is
 * diagnosis, so file probes must not collapse "the file is absent" (often
 * fine) and "the file exists but cannot be read or parsed" (always a real
 * environment problem worth reporting) into one falsy value — that turns a
 * corrupt manifest into a bogus "dependency missing" verdict.
 */
export type Readout<T> =
  | { readonly kind: 'ok'; readonly value: T }
  | { readonly kind: 'absent' }
  | { readonly kind: 'unreadable'; readonly detail: string };

export function unreadable(e: unknown): { kind: 'unreadable'; detail: string } {
  return { kind: 'unreadable', detail: e instanceof Error ? e.message : String(e) };
}

/** Receipt shape emitted by `liteship doctor`. */
export interface DoctorReceipt {
  readonly status: 'ok' | 'failed';
  readonly command: 'doctor';
  readonly timestamp: WallClockTimestamp;
  readonly verdict: DoctorVerdict;
  readonly checks: readonly DoctorCheck[];
  readonly fixed?: readonly DoctorFix[];
  /** Present when `--ci` was passed — warns escalate to exit 1. */
  readonly strict?: true;
  /** Present when `--preflight` was passed — `*.built` probes excluded from verdict. */
  readonly preflight?: true;
  /** Present when `--target` was passed — names the focused host profile. */
  readonly target?: DoctorTarget;
  /** Present when `--deployed <url>` was passed — live header verification. */
  readonly deployed?: string;
}

/** Engine minima read from root package.json `engines`. Fallback to safe defaults. */
export interface EngineMinima {
  readonly node: number;
  readonly pnpm: number;
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
