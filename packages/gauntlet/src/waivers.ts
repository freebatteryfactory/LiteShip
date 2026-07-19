/**
 * LiteShip's waiver registry — the owner-accountable, time-boxed suppressions.
 *
 * A waiver is the escape hatch with TEETH ({@link ./waiver.ts}): every entry
 * carries an owner, a reason, an expiry, a blast radius, and a debt score, and
 * the mechanism actively fights rot (expired → error, stale → warning, forbidden
 * → void). This file is the single committed list the repo run applies; the owner
 * redlines it the same way they redline the assurance map.
 *
 * The bar for an entry here is HIGH. A waiver is NOT a way to make red quiet — it
 * is a signed statement that a specific flagged site is a DECLARED BOUNDARY or a
 * proven-benign best-effort, not unfinished work. It can NEVER cover a placeholder
 * or a skipped test (those are in {@link ALWAYS_BLOCKING_RULES} and any waiver
 * targeting them is void). Each entry says exactly why the site is sanctioned.
 *
 * This registry is the committed list `litelaunchGauntlet` applies over the
 * production scan scope (`packages/&#42;/src`). It holds the declared entropy
 * boundaries the determinism cure deliberately leaves — the single `systemClock` /
 * `systemRng` reads that ALL other runtime time/randomness funnels through — plus
 * a handful of proven-benign best-effort catches in that scope (each suppressing a
 * REAL finding the run surfaces, so each waiver actually has teeth). Everything
 * else the gauntlet surfaces is CURED, not waived.
 *
 * @module
 */

import type { Waiver } from './waiver.js';

/**
 * The annual re-review date for the standing architectural boundaries. A real
 * expiry (not "never") so the boundary is re-confirmed each year: the review asks
 * "is this still the ONLY wall-clock / Math.random read, or did a second one creep
 * in?" — turning the expiry into a recurring audit rather than dead grandfathering.
 */
const BOUNDARY_REVIEW = '2027-06-20';

export const LITESHIP_WAIVERS: readonly Waiver[] = [
  // ── The two declared entropy boundaries (the determinism substrate) ──────────
  // Owner-sanctioned per the assurance-map redline: "waive only if the read is the
  // declared entropy boundary, and the waiver must say exactly that." These ARE
  // those boundaries — the single sanctioned reads every other runtime path routes
  // through `systemClock.now()` / `systemRng.next()`. Not debt; architecture.
  {
    ruleId: 'gauntlet/no-nondeterminism',
    file: 'packages/core/src/clock/clock.ts',
    line: 60,
    owner: 'heyoub',
    reason:
      'systemClock — the declared MONOTONIC entropy boundary (performance.now, with a Date.now fallback for perf-stripped workers/SSR; this flagged line IS that fallback). The sole sanctioned monotonic time read for durations; every elapsed-time path threads an injected Clock defaulting here, so duration logic is deterministic under a manualClock. Centralizing the read is the cure.',
    expires: BOUNDARY_REVIEW,
    blastRadius:
      'If a second un-routed monotonic read exists, duration determinism is silently broken. The annual review re-confirms this is still the sole boundary.',
    debtScore: 1,
  },
  {
    ruleId: 'gauntlet/no-nondeterminism',
    file: 'packages/core/src/clock/clock.ts',
    line: 77,
    owner: 'heyoub',
    reason:
      'wallClock — the declared EPOCH wall-clock entropy boundary (Date.now). The sole sanctioned epoch read for timestamps/HLC wall_ms/time-range checks; every timestamp path threads an injected Clock defaulting here, so timestamps and HLC ordering are deterministic under a fixedClock. Splitting epoch (wallClock) from monotonic (systemClock) is what prevents the perf.now-as-timestamp laundering bug. Centralizing the read is the cure.',
    expires: BOUNDARY_REVIEW,
    blastRadius:
      'If a second un-routed epoch read exists, timestamp/HLC replay is silently broken. The annual review re-confirms this is still the sole boundary.',
    debtScore: 1,
  },
  {
    ruleId: 'gauntlet/no-nondeterminism',
    file: 'packages/core/src/internal/rng.ts',
    line: 39,
    owner: 'heyoub',
    reason:
      'systemRng — the single declared randomness entropy boundary. The ONLY ambient Math.random read in the runtime; every other path threads an injected Rng defaulting here, so randomness is deterministic under a seeded Rng. Centralizing the read is the cure.',
    expires: BOUNDARY_REVIEW,
    blastRadius:
      'If a second un-routed Math.random read exists, seeded replay is silently broken. The annual review re-confirms this is still the sole boundary.',
    debtScore: 1,
  },

  // ── Proven-benign best-effort silent catches in packages/*/src (the scan scope) ─
  // Owner-sanctioned per the redline: a catch is waiveable "only if ... proven
  // best-effort cleanup where failure is non-observable and non-corrupting." Each
  // entry below targets a file the production run (litelaunchGauntlet, scoped to
  // packages/*/src) actually scans, so the waiver has teeth: it suppresses a REAL
  // finding the run surfaces. (The gauntlet's own scripts/* teardown catches are a
  // scripts-scoped concern, not part of this packages/*/src registry — a waiver for
  // an unscanned file is itself stale weight the mechanism would flag.)
  // (No waiver for packages/astro/src/runtime/wgpu.ts: the WGSL fetch-fallback
  // catch was DISCRIMINATED when the shader content-integrity feature landed — it
  // now binds the caught network error and emits its own `wgsl-fetch-fallback-builtin`
  // warnOnce before keeping the built-in shader, so the gate no longer flags it. A
  // waiver for a site that is no longer silent would be STALE weight the mechanism
  // flags — discriminating the catch is the cure, not a renewed suppression.)
  {
    ruleId: 'gauntlet/no-silent-catch',
    file: 'packages/web/src/stream/resumption-pure.ts',
    line: 29,
    owner: 'heyoub',
    reason:
      'Format-detection fallthrough, not an error swallow: HLC.decode throwing means the eventId is simply not canonical HLC, which is the NORMAL legacy-id path — the code falls through to the legacy parsers. The "failure" is non-observable (a legacy id is expected input) and non-corrupting (a parsed result is still returned). Emitting a diagnostic here would fire on every legacy id (noise).',
    expires: BOUNDARY_REVIEW,
    blastRadius:
      'If a malformed-but-colon-containing id silently mis-parses to a legacy shape, resumption could resume from a wrong sequence — but isResumptionState validates the loaded shape on the read path.',
    debtScore: 1,
  },
  {
    ruleId: 'gauntlet/no-silent-catch',
    file: 'packages/cli/src/commands/ship.ts',
    line: 131,
    owner: 'heyoub',
    reason:
      'Best-effort workspace-glob enumeration: an entry that cannot be statSync-d (permission/race) is skipped during package discovery. Non-corrupting (a genuinely unreadable directory entry is not a publishable package) and conservative (skip rather than crash the whole ship). Documented, not empty. (Wave 8: relocated 169→131 by the effect-shed removing the runEffect adapters above resolveGlob.)',
    expires: BOUNDARY_REVIEW,
    blastRadius:
      'A package made unreadable at the wrong moment would be silently omitted from a ship — but a publish of a known package set surfaces the omission downstream (the missing package).',
    debtScore: 1,
  },
  {
    ruleId: 'gauntlet/no-silent-catch',
    file: 'packages/cli/src/commands/doctor/probes-workspace.ts',
    line: 250,
    owner: 'heyoub',
    reason:
      'Best-effort capability probe in the doctor diagnostic: an unreadable playwright-browsers cache dir is treated as "no chromium installed" — the conservative, non-corrupting interpretation, and the doctor then reports chromium as missing (so the failure IS surfaced to the user, just as the normal doctor output). Documented, not empty. (Relocated from doctor.ts:390 by the doctor god-file split into doctor/probes-workspace.ts.)',
    expires: BOUNDARY_REVIEW,
    blastRadius:
      'A transiently-unreadable cache dir would make doctor under-report an installed chromium — a false "missing", which is the safe direction (prompts a reinstall, never hides a real break).',
    debtScore: 1,
  },
  {
    ruleId: 'gauntlet/no-silent-catch',
    file: 'packages/cli/src/commands/version.ts',
    line: 46,
    owner: 'heyoub',
    reason:
      'Best-effort CLI-version resolution: import.meta.url may be unavailable in odd bundling/loader contexts, so readCliVersion skips the module-relative package.json candidate and falls through to the cwd-relative one. Non-corrupting (a real version is still resolved from the workspace) and conservative. Documented, not empty. (Surfaced into its own file when readCliVersion was relocated out of doctor.ts by the split; shifted 47→46 when the Wave 5 runCliCommand migration dropped the spawn imports above it.)',
    expires: BOUNDARY_REVIEW,
    blastRadius:
      'With no import.meta.url, the version read falls back to the cwd package.json — at worst a wrong version string when run from an unrelated cwd, never a crash or corrupted state.',
    debtScore: 1,
  },
];
