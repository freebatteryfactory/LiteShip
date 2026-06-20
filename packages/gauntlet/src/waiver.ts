/**
 * Waivers — the escape hatch with TEETH.
 *
 * A waiver suppresses a specific finding, but it is NOT a way to make red go
 * away quietly. Every waiver carries an `owner`, a `reason`, an `expires` date,
 * a `blastRadius`, and a `debtScore` — accountability, a clock, and a cost. The
 * mechanism actively fights rot:
 *
 * - an EXPIRED waiver is itself an `error` finding (the debt came due);
 * - a STALE waiver (matches nothing) is a `warning` (clean it up);
 * - a FORBIDDEN waiver (targets an {@link ALWAYS_BLOCKING_RULES} rule — the
 *   skip/placeholder family) is VOID: it errors AND the underlying finding is
 *   still kept. You cannot waive a lie.
 *
 * Determinism is mandatory: the "is it expired?" clock is an INJECTED `now`
 * parameter — never `Date.now()`. The same findings + waivers + `now` always
 * produce the same partition.
 *
 * Composition, not inheritance: a waiver is a data record; {@link applyWaivers}
 * is a pure function over `(findings, waivers, now)`.
 *
 * @module
 */

import { finding, type Finding } from './finding.js';

/**
 * A single waiver — owner-accountable, time-boxed suppression of one finding.
 *
 * A waiver MATCHES a finding iff `ruleId` is equal AND (if {@link file} is set)
 * the finding's file is equal AND (if {@link line} is set) the finding's line is
 * equal. The narrower the waiver, the less it accidentally suppresses.
 */
export interface Waiver {
  /** The rule whose finding this waiver suppresses (must equal the finding's `ruleId`). */
  readonly ruleId: string;
  /** Optional file scope — when set, only findings in this file match. */
  readonly file?: string;
  /** Optional line scope — when set, only findings on this line match. */
  readonly line?: number;
  /** Who owns this debt — accountability is mandatory, never anonymous. */
  readonly owner: string;
  /** Why the finding is being suppressed — the justification of record. */
  readonly reason: string;
  /** When the waiver dies (ISO `yyyy-mm-dd`). Past `now` → an `error` finding. */
  readonly expires: string;
  /** What breaks if this debt is wrong — the honesty tax on a waiver. */
  readonly blastRadius: string;
  /** A numeric cost for this debt — feeds debt rollups / ratchets. */
  readonly debtScore: number;
}

/**
 * Rule ids a waiver can NEVER cover — the skip / placeholder family. A waiver
 * targeting one of these is VOID (it errors, and the finding it tried to
 * suppress is still kept). This is the "you cannot waive a lie" floor: a
 * placeholder / skipped test / TODO is never shippable and never waivable.
 *
 * These two ids are exactly the rules the always-blocking gates emit —
 * `noPlaceholderGate` (`gauntlet/no-placeholder`) and `noSkippedTestGate`
 * (`gauntlet/no-skipped-test`). The floor is therefore NOT inert surface: a real
 * gate emits each rule, so a waiver that tries to cover a placeholder or a skipped
 * test is void against a finding that actually exists. Easy to extend: append the
 * rule id of any future always-blocking gate. Kept as a `readonly string[]` so
 * downstream can compose its own forbidden set by spreading this one:
 * `[...ALWAYS_BLOCKING_RULES, 'my/never-waivable']`.
 */
export const ALWAYS_BLOCKING_RULES: readonly string[] = [
  // Emitted by noPlaceholderGate — placeholder directive comments + unimplemented stubs.
  'gauntlet/no-placeholder',
  // Emitted by noSkippedTestGate — skipped tests (the dot-skip / dot-todo / x-prefixed forms).
  'gauntlet/no-skipped-test',
];

/** The partition {@link applyWaivers} returns. */
export interface WaiverApplication {
  /** Findings NOT suppressed — they remain subject to the authority ratchet. */
  readonly kept: Finding[];
  /** Findings a valid, matching, non-expired waiver suppressed. */
  readonly waived: Finding[];
  /** Findings ABOUT the waivers themselves (expired / stale / forbidden). */
  readonly waiverFindings: Finding[];
}

/** True iff `waiver` matches `f` by ruleId (+ file, + line when the waiver sets them). */
function waiverMatchesFinding(waiver: Waiver, f: Finding): boolean {
  if (waiver.ruleId !== f.ruleId) return false;
  if (waiver.file !== undefined && waiver.file !== f.location?.file) return false;
  if (waiver.line !== undefined && waiver.line !== f.location?.line) return false;
  return true;
}

/**
 * Expired iff the waiver's `expires` date is strictly before `now`. We compare
 * at day granularity so a waiver expiring "today" is still valid for all of
 * today (the contract: `new Date(expires) >= now`). Pure given `now`.
 */
function isExpired(waiver: Waiver, now: Date): boolean {
  return new Date(waiver.expires).getTime() < now.getTime();
}

/** True iff this waiver targets a rule no waiver may ever cover. */
function isForbidden(waiver: Waiver): boolean {
  return ALWAYS_BLOCKING_RULES.includes(waiver.ruleId);
}

/**
 * Partition `findings` against `waivers` as of `now`. Pure + deterministic:
 *
 * - A finding is WAIVED iff some VALID (non-expired, non-forbidden) waiver
 *   matches it → it goes to `waived`, not `kept`.
 * - An EXPIRED waiver → an `error` finding (`gauntlet/waiver-expired`) naming the
 *   rule + expiry + owner. The finding it would have covered is NOT suppressed.
 * - A STALE waiver (not expired, not forbidden, matches NO finding) → a `warning`
 *   (`gauntlet/waiver-stale`).
 * - A FORBIDDEN waiver (targets {@link ALWAYS_BLOCKING_RULES}) → an `error`
 *   (`gauntlet/waiver-forbidden`); it is VOID, so any finding it "matches" stays
 *   in `kept`.
 *
 * `now` is injected — there is NO `Date.now()` here.
 */
export function applyWaivers(
  findings: readonly Finding[],
  waivers: readonly Waiver[],
  now: Date,
): WaiverApplication {
  const waiverFindings: Finding[] = [];

  // Partition the waivers up front: only ACTIVE (non-expired, non-forbidden)
  // waivers can actually suppress a finding. Expired/forbidden waivers emit their
  // own finding and never suppress.
  const activeWaivers: Waiver[] = [];
  // Track which active waivers matched ≥1 finding, to detect staleness.
  const matchedActive = new Set<Waiver>();

  for (const waiver of waivers) {
    if (isForbidden(waiver)) {
      waiverFindings.push(
        finding({
          ruleId: 'gauntlet/waiver-forbidden',
          severity: 'error',
          level: 'L4',
          title: 'Waiver targets an always-blocking rule (void)',
          detail: `Waiver by ${waiver.owner} targets "${waiver.ruleId}", which is in ALWAYS_BLOCKING_RULES — the skip/placeholder family that no waiver may ever cover. The waiver is VOID: the underlying finding is still kept. Remove the waiver and fix the code (a placeholder/skip is never shippable, never waivable).`,
          ...(waiver.file !== undefined
            ? { location: { file: waiver.file, ...(waiver.line !== undefined ? { line: waiver.line } : {}) } }
            : {}),
          remediation: {
            kind: 'instruction',
            description: 'A forbidden-rule waiver cannot exist — delete it and resolve the finding.',
            steps: [
              `Delete the waiver targeting "${waiver.ruleId}" (owner: ${waiver.owner}).`,
              'Fix the underlying finding directly — an always-blocking rule names a lie (skip/placeholder) that must be made real, not suppressed.',
            ],
          },
        }),
      );
      continue;
    }
    if (isExpired(waiver, now)) {
      waiverFindings.push(
        finding({
          ruleId: 'gauntlet/waiver-expired',
          severity: 'error',
          level: 'L2',
          title: 'Expired waiver (the debt came due)',
          detail: `Waiver by ${waiver.owner} for rule "${waiver.ruleId}" expired ${waiver.expires}. The suppression no longer holds: the finding it covered is now live again. Either fix the underlying issue or renew the waiver with a fresh owner-signed expiry and an honest debtScore (current: ${waiver.debtScore}).`,
          ...(waiver.file !== undefined
            ? { location: { file: waiver.file, ...(waiver.line !== undefined ? { line: waiver.line } : {}) } }
            : {}),
          remediation: {
            kind: 'instruction',
            description: 'An expired waiver blocks — resolve or renew it.',
            steps: [
              `Fix the finding for "${waiver.ruleId}" that this waiver covered (preferred — pay the debt down).`,
              `Or renew the waiver: bump "expires" past today, re-confirm the owner (${waiver.owner}), reason, and blastRadius.`,
            ],
          },
        }),
      );
      continue;
    }
    activeWaivers.push(waiver);
  }

  // Walk the findings: a finding matched by any ACTIVE waiver is waived; else kept.
  const kept: Finding[] = [];
  const waived: Finding[] = [];
  for (const f of findings) {
    const matching = activeWaivers.find((w) => waiverMatchesFinding(w, f));
    if (matching !== undefined) {
      matchedActive.add(matching);
      waived.push(f);
    } else {
      kept.push(f);
    }
  }

  // Any active waiver that matched NOTHING is stale (dead weight — clean it up).
  for (const waiver of activeWaivers) {
    if (!matchedActive.has(waiver)) {
      waiverFindings.push(
        finding({
          ruleId: 'gauntlet/waiver-stale',
          severity: 'warning',
          level: 'L1',
          title: 'Stale waiver (matches no finding)',
          detail: `Waiver by ${waiver.owner} for rule "${waiver.ruleId}"${waiver.file !== undefined ? ` in ${waiver.file}` : ''} matches no current finding — the issue it suppressed is gone (or never existed). A stale waiver is dead weight that hides drift; remove it.`,
          ...(waiver.file !== undefined
            ? { location: { file: waiver.file, ...(waiver.line !== undefined ? { line: waiver.line } : {}) } }
            : {}),
          remediation: {
            kind: 'instruction',
            description: 'Delete the waiver — it no longer suppresses anything.',
            steps: [`Remove the waiver targeting "${waiver.ruleId}" (owner: ${waiver.owner}); nothing matches it.`],
          },
        }),
      );
    }
  }

  return { kept, waived, waiverFindings };
}
