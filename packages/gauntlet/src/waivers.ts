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
 * production scan scope (`packages/&#42;/src`). It holds ONLY the declared entropy
 * boundaries the determinism cure deliberately leaves — the single `systemClock` /
 * `systemRng` reads that ALL other runtime time/randomness funnels through (each
 * suppressing a REAL finding the run surfaces, so each waiver actually has teeth).
 * The former best-effort silent-catch waivers were retired when those catches were
 * CURED (given explicit, non-swallowing fallback bodies). Everything else the
 * gauntlet surfaces is CURED, not waived.
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
    file: 'packages/core/src/clock/rng.ts',
    line: 39,
    owner: 'heyoub',
    reason:
      'systemRng — the single declared randomness entropy boundary. The ONLY ambient Math.random read in the runtime; every other path threads an injected Rng defaulting here, so randomness is deterministic under a seeded Rng. Centralizing the read is the cure.',
    expires: BOUNDARY_REVIEW,
    blastRadius:
      'If a second un-routed Math.random read exists, seeded replay is silently broken. The annual review re-confirms this is still the sole boundary.',
    debtScore: 1,
  },

  // ── Silent catches in packages/*/src: CURED, not waived ─────────────────────
  // There are NO no-silent-catch waivers. Every best-effort catch the production
  // run (litelaunchGauntlet, scoped to packages/*/src) once suppressed here has been
  // DISCRIMINATED — the cure, not a renewed suppression — exactly the pattern the
  // WGSL fetch-fallback set (packages/astro/src/runtime/wgpu.ts binds the network
  // error + emits its own `wgsl-fetch-fallback-builtin` warnOnce). The four former
  // benign-catch waivers (resumption-pure.ts, ship.ts, doctor/probes-workspace.ts,
  // version.ts) were retired when their catches were given explicit, non-swallowing
  // fallback bodies (an explicit `return`/`continue` of the conservative,
  // non-corrupting value the site already meant). A waiver for a site that is no
  // longer silent would be STALE weight the mechanism flags — so the L3-scoped
  // no-silent-catch backlog is now EMPTY, the honest floor.
];
