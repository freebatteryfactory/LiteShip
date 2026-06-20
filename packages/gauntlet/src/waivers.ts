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
 * Today the registry holds only the declared entropy boundaries the determinism
 * cure deliberately leaves — the single `systemClock` / `systemRng` reads that ALL
 * other runtime time/randomness funnels through — and one proven-benign teardown.
 * Everything else the gauntlet surfaces is CURED, not waived.
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
    file: 'packages/core/src/clock.ts',
    line: 61,
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
    file: 'packages/core/src/clock.ts',
    line: 78,
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
    file: 'packages/core/src/rng.ts',
    line: 39,
    owner: 'heyoub',
    reason:
      'systemRng — the single declared randomness entropy boundary. The ONLY ambient Math.random read in the runtime; every other path threads an injected Rng defaulting here, so randomness is deterministic under a seeded Rng. Centralizing the read is the cure.',
    expires: BOUNDARY_REVIEW,
    blastRadius:
      'If a second un-routed Math.random read exists, seeded replay is silently broken. The annual review re-confirms this is still the sole boundary.',
    debtScore: 1,
  },

  // ── Proven-benign best-effort teardown ───────────────────────────────────────
  // Owner-sanctioned per the redline: a teardown catch is waiveable "only if ...
  // proven best-effort cleanup where failure is non-observable and non-corrupting."
  // Killing an already-dead process group (ESRCH) is exactly that: the only failure
  // mode is "the process is already gone", which is the desired post-state anyway.
  {
    ruleId: 'gauntlet/no-silent-catch',
    file: 'scripts/gauntlet.ts',
    line: 49,
    owner: 'heyoub',
    reason:
      'Best-effort process-group kill in the gauntlet runner teardown. The catch swallows only the already-dead/ESRCH case — non-observable (no caller depends on the kill succeeding) and non-corrupting (the desired post-state, a dead process group, is reached either way). The catch is documented, not empty.',
    expires: BOUNDARY_REVIEW,
    blastRadius:
      'If the kill fails for a reason OTHER than already-dead, a stray child process could linger — but that surfaces as a hung CI step, not silent corruption.',
    debtScore: 1,
  },
  {
    ruleId: 'gauntlet/no-silent-catch',
    file: 'packages/astro/src/runtime/wgpu.ts',
    line: 287,
    owner: 'heyoub',
    reason:
      'WGSL shader fetch with graceful fallback. The DIAGNOSTIC IS EMITTED upstream: fetchShaderSource itself calls Diagnostics.warn on both !response.ok and a thrown fetch (codes wgsl-fetch-failed / wgsl-fetch-threw). The catch here keeps the built-in fallback shader — observable failure, non-corrupting fallback. Meets the "emit diagnostics" bar exactly.',
    expires: BOUNDARY_REVIEW,
    blastRadius:
      'If the upstream warn is ever removed, a fetch failure would degrade to the fallback shader silently. Pin: the waiver reason names the upstream Diagnostics.warn codes.',
    debtScore: 1,
  },
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
    line: 169,
    owner: 'heyoub',
    reason:
      'Best-effort workspace-glob enumeration: an entry that cannot be statSync-d (permission/race) is skipped during package discovery. Non-corrupting (a genuinely unreadable directory entry is not a publishable package) and conservative (skip rather than crash the whole ship). Documented, not empty.',
    expires: BOUNDARY_REVIEW,
    blastRadius:
      'A package made unreadable at the wrong moment would be silently omitted from a ship — but a publish of a known package set surfaces the omission downstream (the missing package).',
    debtScore: 1,
  },
  {
    ruleId: 'gauntlet/no-silent-catch',
    file: 'packages/cli/src/commands/doctor.ts',
    line: 390,
    owner: 'heyoub',
    reason:
      'Best-effort capability probe in the doctor diagnostic: an unreadable playwright-browsers cache dir is treated as "no chromium installed" — the conservative, non-corrupting interpretation, and the doctor then reports chromium as missing (so the failure IS surfaced to the user, just as the normal doctor output). Documented, not empty.',
    expires: BOUNDARY_REVIEW,
    blastRadius:
      'A transiently-unreadable cache dir would make doctor under-report an installed chromium — a false "missing", which is the safe direction (prompts a reinstall, never hides a real break).',
    debtScore: 1,
  },
];
