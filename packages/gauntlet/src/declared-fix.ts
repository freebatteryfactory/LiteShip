/**
 * The DECLARED-FIX PROTOCOL — the AGENT-SAFETY META-GAUNTLET (the "raccoon rule"),
 * phases B (runtime admission) + C (the commit-gate protocol).
 *
 * Phase A (the {@link StandardsIntegrityFacts} backstop) catches a SILENT weakening
 * of the gauntlet's own rigor standards on the COMMIT path — it diffs committed
 * reality against a content-addressed snapshot and blocks an unsigned weakening
 * regardless of who/how it landed. But "the repairman may be a raccoon with commit
 * access" has a second face: an agent that AUTO-FIXES (the `--fix` / remediation /
 * apply path) could slip a scope-creeping or gate-weakening edit IN through the very
 * channel meant to repair, declaring "I'm fixing X" while actually touching Y.
 *
 * This module is the DECLARED-FIX admission control. An agent's auto-fix must DECLARE
 * its intent + scope + size-cap + before/after receipts up front; the
 * {@link verifyDeclaredFix} verifier then checks the ACTUAL change against the
 * declaration AND against phase A's weakening-diff:
 *
 *   (a) SCOPE     — every actually-changed file is INSIDE the declared scope (a
 *                   touched file outside the declared globs/keys = scope creep = reject).
 *   (b) SIZE      — the change is within the declared {@link DeclaredFix.sizeCap}
 *                   (changed-files + changed-lines ceilings — a bloated edit = reject).
 *   (c) WEAKENING — reuses phase A: `diffStandardsSurface(before, after)` +
 *                   `applyStandardsWaivers` — any UNSIGNED standards weakening = reject;
 *                   an always-blocking weakening can NEVER be signed (NEVER_SIGNABLE).
 *   (d) RECEIPTS  — present + CONSISTENT: the `beforeReceipt` matches the pre-fix
 *                   standards-surface address (+ the touched files' digests) the host
 *                   measured, the `afterReceipt` matches the post-fix one. A forged or
 *                   missing receipt = reject (an agent cannot claim a fix it didn't run).
 *
 * REPORT-not-DECIDE: the verdict is a self-explaining `rejected{reasons[]}` (each
 * reason names its class), never a bare boolean — the gate folds these into Findings.
 *
 * ONE ENGINE, TWO MOMENTS (B composes with C): the SAME {@link verifyDeclaredFix}
 * runs at the APPLY moment (phase B — admit-or-reject a proposed fix at the seam,
 * mirroring the runtime `admitGraphPatchProposal` SHAPE) AND as the COMMIT gate
 * (phase C — `declaredFixProtocolGate` folds the verdict). The agent declares its
 * fix once; the verifier checks declaration-vs-reality + no-weakening at both moments.
 *
 * LEAN BY CONSTRUCTION (ADR-0012): like {@link StandardsIntegrityFacts}, this module
 * defines ONLY the lean DATA + the PURE verifier. It carries NO heavy dependency —
 * it never reads the filesystem, never content-addresses (the `contentAddressOf`
 * kernel lives in `@czap/core`; the HOST mints the receipts), and never reads a clock
 * (the HOST injects `now` for the sign-off-expiry check). The host measures the
 * actual change + mints the receipts + supplies the before/after standards surfaces;
 * the verifier just decides.
 *
 * Composition, not inheritance: every record is a `_tag`-discriminated DATA value;
 * the verifier is standalone functions over them. No classes.
 *
 * @module
 */

import type { StandardsElement, StandardsWaiver } from './standards-facts.js';
import { diffStandardsSurface, applyStandardsWaivers } from './standards-facts.js';

// ─────────────────────────────── the receipt ────────────────────────────────

/**
 * A content-addressed RECEIPT of the standards surface + the touched files at one
 * moment (before OR after the fix). The HOST mints it through the ONE
 * `contentAddressOf` kernel; this module only COMPARES two receipts for consistency
 * (a forged/missing receipt is the raccoon claiming a fix it never ran).
 *
 * The receipt is PURE DATA — the host measured it; the verifier never re-derives an
 * address here (the gauntlet stays lean, carries no fnv1a kernel).
 */
export interface FixReceipt {
  readonly _tag: 'fix-receipt';
  /**
   * The content address of the standards SURFACE at this moment (the same
   * `fnv1a:`-prefixed address the phase-A `StandardsSurface.address` carries) — the
   * keystone the verifier checks against the host-measured surface address.
   */
  readonly standardsAddress: string;
  /**
   * The per-file content DIGESTS of the files the fix touched, at this moment, keyed
   * by repo-relative path. The host reads each touched file's bytes and mints its
   * digest through the SAME kernel. The before/after digests let the verifier confirm
   * the receipt describes the SAME file set the actual change reports (a receipt that
   * omits a touched file is inconsistent).
   */
  readonly touchedDigests: Readonly<Record<string, string>>;
  /**
   * The wall-clock ISO timestamp the host stamped the receipt at (two-clock law — a
   * TIMESTAMP, so `wallClock`, never `systemClock`). Carried for the audit trail; the
   * verifier does NOT compare timestamps (a fix takes real time, so before ≠ after is
   * expected) — only the addresses + digests decide consistency.
   */
  readonly stampedAt: string;
}

// ─────────────────────────────── the declared fix ───────────────────────────

/**
 * The agent's DECLARATION of an auto-fix — what it INTENDS to do, the SCOPE it is
 * allowed to touch, the SIZE it is capped to, and the before/after receipts. Pure
 * data; content-addressable (the host can content-address the whole record to bind
 * an apply to its declaration). The agent fills this in BEFORE the verifier checks
 * the actual change against it.
 */
export interface DeclaredFix {
  readonly _tag: 'declared-fix';
  /** The human/agent statement of WHAT this fix does + WHY — the intent of record. */
  readonly intent: string;
  /** The exact scope the fix is ALLOWED to touch — anything actually changed outside it is scope creep. */
  readonly scope: FixScope;
  /** The maximum size the change may reach — anything larger is a bloated, undeclared edit. */
  readonly sizeCap: FixSizeCap;
  /** The content-addressed snapshot of the standards surface + touched files BEFORE the fix. */
  readonly beforeReceipt: FixReceipt;
  /** The content-addressed snapshot of the standards surface + touched files AFTER the fix. */
  readonly afterReceipt: FixReceipt;
}

/**
 * The scope a {@link DeclaredFix} is permitted to touch — repo-relative file GLOBS
 * (the files it may edit) and the standards-element KEYS it may legitimately change
 * (so a fix that declares it touches a floor can change that floor's element, but a
 * fix that declares no standards keys must not change ANY standards element). Both
 * lists are explicit allow-lists: empty = the fix may touch NOTHING of that kind.
 */
export interface FixScope {
  /**
   * The repo-relative file globs the fix may edit (e.g. `packages/core/src/fnv.ts`,
   * `packages/astro/src/**`). A `*` matches within a path segment; `**` matches across
   * segments (the same minimal glob shape the assurance map uses). An actually-changed
   * file matching NONE of these is scope creep.
   */
  readonly fileGlobs: readonly string[];
  /**
   * The {@link StandardsElement} keys (`surfaceElementKey`) the fix is ALLOWED to
   * change — its declared standards footprint. A standards element that CHANGED but is
   * not in this list is an undeclared standards edit (caught even when it is a
   * strengthen — the agent must declare its standards footprint, not just avoid
   * weakening). Empty = the fix declares it touches NO standards element.
   */
  readonly standardsElementKeys: readonly string[];
}

/**
 * The size ceiling a {@link DeclaredFix} is capped to. BOTH ceilings are hard upper
 * bounds — a change exceeding EITHER is rejected (a raccoon cannot smuggle a large
 * edit by declaring a small file count but a huge line delta, or vice versa).
 */
export interface FixSizeCap {
  /** Max number of files the change may touch (≥ the actually-changed file count). */
  readonly maxChangedFiles: number;
  /** Max total changed lines (added + removed) across all touched files. */
  readonly maxChangedLines: number;
}

// ─────────────────────────────── the actual change ──────────────────────────

/**
 * The ACTUAL change the host MEASURED — what really happened on disk (the
 * counterpart to the {@link DeclaredFix}'s declaration). The host computes this from
 * the working tree / the apply diff; the verifier checks the declaration against it.
 * Pure data — no I/O here.
 */
export interface ActualChange {
  readonly _tag: 'actual-change';
  /** The repo-relative paths the change actually touched (added / modified / deleted). */
  readonly changedFiles: readonly string[];
  /** The total changed lines (added + removed) the host measured across all touched files. */
  readonly changedLines: number;
}

// ─────────────────────────────── the verdict ────────────────────────────────

/**
 * The CLASS of a single rejection reason — the specific admission failure, so the
 * gate can fold each into a self-explaining, separately-actionable Finding. Mirrors
 * the four verifier checks (+ the never-signable always-blocking floor, surfaced
 * distinctly from a plain unsigned weakening because it can NEVER be cured by a
 * sign-off — only by reversing the weakening).
 */
export type FixRejectionClass =
  'scope-creep' | 'size-exceeded' | 'unsigned-weakening' | 'forbidden-weakening' | 'forged-receipt';

/** One self-explaining rejection reason — its class + the human WHY (REPORT-not-DECIDE). */
export interface FixRejection {
  readonly class: FixRejectionClass;
  /** Human-readable WHY — enough to act on without re-running the verifier. */
  readonly detail: string;
}

/**
 * The verifier's VERDICT — `admitted` (the fix is in-scope, sized, non-weakening, and
 * receipted) or `rejected` with the structured reasons + NO admission. A
 * `_tag`-discriminated union (composition, not a status enum + nullable fields), so
 * the gate folds on the tag.
 */
export type FixVerdict =
  { readonly _tag: 'admitted' } | { readonly _tag: 'rejected'; readonly reasons: readonly FixRejection[] };

// ─────────────────────────────── the glob matcher ───────────────────────────
//
// A minimal, deterministic repo-relative glob — `*` within ONE segment, `**` across
// segments — a strict SUBSET of `assurance-map`'s dialect (which also has `{a,b}`
// alternation; a declared-fix scope needs only `*`/`**`, so the matcher is kept tiny
// and self-contained, pinned by the glob-semantics guard test). It is a structural
// matcher, NOT an inline slash-normalizer: it segments on `/` and matches, it never
// rewrites a path.

/** Escape a literal for use inside a RegExp (so a `.` in a path matches a literal dot). */
function escapeRegExpLiteral(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Compile a repo-relative glob into an anchored RegExp source. `**` matches across
 * path segments (including `/`), a single `*` matches within ONE segment (no `/`),
 * everything else is a literal. Deterministic + pure.
 */
function globToRegExpSource(glob: string): string {
  let out = '';
  let i = 0;
  // `charAt` returns '' past the end (never undefined), so the cursor logic stays sound
  // under noUncheckedIndexedAccess without a non-null assertion.
  while (i < glob.length) {
    const ch = glob.charAt(i);
    if (ch === '*') {
      if (glob.charAt(i + 1) === '*') {
        out += '.*';
        i += 2;
        // Swallow a trailing `/` after `**` so `a/**/b` and `a/**` both behave.
        if (glob.charAt(i) === '/') i += 1;
        continue;
      }
      out += '[^/]*';
      i += 1;
      continue;
    }
    out += escapeRegExpLiteral(ch);
    i += 1;
  }
  return `^${out}$`;
}

/** True iff the repo-relative `path` matches the repo-relative `glob`. */
export function fileMatchesGlob(path: string, glob: string): boolean {
  return new RegExp(globToRegExpSource(glob)).test(path);
}

/** True iff `path` matches ANY of the allow-list `globs`. */
function fileInScope(path: string, globs: readonly string[]): boolean {
  for (const glob of globs) {
    if (fileMatchesGlob(path, glob)) return true;
  }
  return false;
}

// ─────────────────────────────── the four checks ────────────────────────────

/** Code-unit (UTF-16) compare — byte-stable across machines/locales, never `localeCompare`. */
function codeUnitCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * CHECK (a) — SCOPE. Every actually-changed file must be inside the declared file
 * globs. A touched file matching no glob is scope creep (one rejection per offending
 * file, so the report names each). Deterministic order (sorted by path).
 */
function checkScope(fix: DeclaredFix, change: ActualChange): readonly FixRejection[] {
  const out: FixRejection[] = [];
  for (const file of [...change.changedFiles].sort(codeUnitCompare)) {
    if (!fileInScope(file, fix.scope.fileGlobs)) {
      out.push({
        class: 'scope-creep',
        detail: `the fix touched "${file}", which is OUTSIDE its declared scope (globs: ${fix.scope.fileGlobs.length === 0 ? '<none>' : fix.scope.fileGlobs.join(', ')}). A declared fix may only edit the files it declared — an out-of-scope edit is scope creep, the raccoon slipping an undeclared change through the apply path. Declared intent: "${fix.intent}".`,
      });
    }
  }
  return out;
}

/**
 * CHECK (b) — SIZE. The actual change must be within BOTH the declared file-count and
 * line-count ceilings. Either exceeded is a rejection (a bloated, undeclared edit).
 */
function checkSize(fix: DeclaredFix, change: ActualChange): readonly FixRejection[] {
  const out: FixRejection[] = [];
  const fileCount = change.changedFiles.length;
  if (fileCount > fix.sizeCap.maxChangedFiles) {
    out.push({
      class: 'size-exceeded',
      detail: `the fix changed ${fileCount} file(s), exceeding its declared cap of ${fix.sizeCap.maxChangedFiles}. A declared fix is capped to its declared size — a larger edit is undeclared scope the agent did not commit to. Declared intent: "${fix.intent}".`,
    });
  }
  if (change.changedLines > fix.sizeCap.maxChangedLines) {
    out.push({
      class: 'size-exceeded',
      detail: `the fix changed ${change.changedLines} line(s), exceeding its declared cap of ${fix.sizeCap.maxChangedLines}. A declared fix is capped to its declared size — a larger edit is undeclared scope the agent did not commit to. Declared intent: "${fix.intent}".`,
    });
  }
  return out;
}

/**
 * CHECK (c) — NO UNSIGNED WEAKENING. Reuses phase A end-to-end: diff the BEFORE vs
 * AFTER standards surfaces, apply the owner sign-offs against the injected `now` (the
 * two-clock law — never `Date.now()`) + the live always-blocking rule ids, and reject
 * any UNSIGNED weakening. An always-blocking weakening is surfaced as its OWN class
 * (`forbidden-weakening`) — it can NEVER be cured by a sign-off, only by reversing it.
 *
 * This is the EXACT same engine the commit backstop uses — a fix cannot weaken the
 * standards through the apply path any more than through a raw commit. A standards
 * element that CHANGED but is not in the declared `standardsElementKeys` is ALSO a
 * rejection (an undeclared standards edit, even a strengthen — the agent must declare
 * its standards footprint).
 */
function checkNoWeakening(
  fix: DeclaredFix,
  standardsBefore: readonly StandardsElement[],
  standardsAfter: readonly StandardsElement[],
  signoffs: readonly StandardsWaiver[],
  now: Date,
  alwaysBlockingRuleIds: ReadonlySet<string>,
): readonly FixRejection[] {
  const out: FixRejection[] = [];
  const changes = diffStandardsSurface(standardsBefore, standardsAfter);

  // Every changed standards element must be in the declared footprint (declared-scope
  // for standards) — an undeclared standards change is rejected regardless of direction.
  const declared = new Set(fix.scope.standardsElementKeys);
  for (const c of changes) {
    if (!declared.has(c.elementKey)) {
      out.push({
        class: 'scope-creep',
        detail: `the fix changed the standards element "${c.elementKey}" (${c.changeClass}), which is NOT in its declared standards footprint (${fix.scope.standardsElementKeys.length === 0 ? '<none>' : fix.scope.standardsElementKeys.join(', ')}). A declared fix must declare every standards element it touches — an undeclared standards edit is scope creep on the rigor surface itself. ${c.detail}`,
      });
    }
  }

  // Reuse phase A's owner-sign-off partition: an unsigned weakening blocks; an
  // always-blocking weakening can NEVER be signed (the forbidden floor).
  const partitioned = applyStandardsWaivers(changes, signoffs, now, alwaysBlockingRuleIds);
  for (const c of partitioned.unsignedWeakenings) {
    // Distinguish the never-signable floor from a plain unsigned weakening: a
    // forbidden weakening showed up as a forbidden sign-off OR carries the
    // always-blocking-removed class — either way it can never be cured by a sign-off.
    const isForbidden =
      c.weakening === 'always-blocking-removed' ||
      partitioned.forbiddenSignoffs.some((f) => f.elementKey === c.elementKey);
    out.push({
      class: isForbidden ? 'forbidden-weakening' : 'unsigned-weakening',
      detail: isForbidden
        ? `the fix WEAKENED the always-blocking floor at "${c.elementKey}" (class "${c.weakening ?? 'unknown'}") — this can NEVER be signed off (the placeholder/skip floor). The fix is rejected and the weakening must be reversed. ${c.detail}`
        : `the fix WEAKENED the standards at "${c.elementKey}" (class "${c.weakening ?? 'unknown'}") WITHOUT an owner sign-off — the SAME raccoon rule the commit backstop enforces, now on the apply path. Reverse the weakening, or add an owner-signed standards-waiver (elementKey + class + expiry). ${c.detail}`,
    });
  }
  // An EXPIRED sign-off re-reds (the deferral came due) — reuse phase A's verdict.
  for (const e of partitioned.expiredSignoffs) {
    out.push({
      class: 'unsigned-weakening',
      detail: `the standards-waiver by ${e.owner} authorizing the weakening at "${e.elementKey}" EXPIRED ${e.expiry} — the deferral came due, so the weakening is unsigned again and the fix is rejected. Reverse the weakening or renew the sign-off.`,
    });
  }
  return out;
}

/**
 * CHECK (d) — RECEIPT CONSISTENCY. The declared receipts must be PRESENT and match
 * the host-measured reality:
 *  - the `beforeReceipt.standardsAddress` must equal the host-measured BEFORE
 *    standards-surface address, and `afterReceipt.standardsAddress` the AFTER one (a
 *    forged surface address = the agent claiming a standards state it never measured);
 *  - the AFTER receipt's `touchedDigests` keys must EXACTLY cover the actually-changed
 *    files (no missing touched file, no phantom file) — a receipt that omits a touched
 *    file is inconsistent (the raccoon hiding an edit from the receipt).
 *
 * The host supplies the measured addresses (it minted them via `contentAddressOf`);
 * the verifier only COMPARES — it carries no kernel.
 */
function checkReceipts(
  fix: DeclaredFix,
  change: ActualChange,
  measuredBeforeAddress: string,
  measuredAfterAddress: string,
): readonly FixRejection[] {
  const out: FixRejection[] = [];

  if (fix.beforeReceipt.standardsAddress.trim() === '' || fix.afterReceipt.standardsAddress.trim() === '') {
    out.push({
      class: 'forged-receipt',
      detail: `a fix receipt is MISSING its standards-surface address (before="${fix.beforeReceipt.standardsAddress}", after="${fix.afterReceipt.standardsAddress}"). A declared fix must carry both content-addressed receipts — a missing receipt cannot be verified and is rejected.`,
    });
  }
  if (fix.beforeReceipt.standardsAddress !== measuredBeforeAddress) {
    out.push({
      class: 'forged-receipt',
      detail: `the beforeReceipt's standards address "${fix.beforeReceipt.standardsAddress}" does NOT match the host-measured pre-fix standards surface "${measuredBeforeAddress}" — a forged or stale before-receipt. The fix is rejected: an agent cannot claim a fix against a standards state it did not measure.`,
    });
  }
  if (fix.afterReceipt.standardsAddress !== measuredAfterAddress) {
    out.push({
      class: 'forged-receipt',
      detail: `the afterReceipt's standards address "${fix.afterReceipt.standardsAddress}" does NOT match the host-measured post-fix standards surface "${measuredAfterAddress}" — a forged after-receipt. The fix is rejected: the receipt must describe the standards surface the fix actually produced.`,
    });
  }

  // The AFTER receipt must account for EXACTLY the actually-changed files.
  const receiptedFiles = new Set(Object.keys(fix.afterReceipt.touchedDigests));
  const changedFiles = new Set(change.changedFiles);
  for (const file of [...changedFiles].sort(codeUnitCompare)) {
    if (!receiptedFiles.has(file)) {
      out.push({
        class: 'forged-receipt',
        detail: `the fix changed "${file}" but the afterReceipt's touchedDigests does NOT record it — the receipt hides a touched file. The fix is rejected: every touched file must be receipted (no edit may escape the receipt).`,
      });
    }
  }
  for (const file of [...receiptedFiles].sort(codeUnitCompare)) {
    if (!changedFiles.has(file)) {
      out.push({
        class: 'forged-receipt',
        detail: `the afterReceipt records a touched digest for "${file}", but the host measured NO change to it — a phantom receipt entry. The fix is rejected: the receipt must describe the real change, not a fabricated one.`,
      });
    }
  }

  return out;
}

// ─────────────────────────────── the verifier ───────────────────────────────

/**
 * The HOST's measured reality the verifier checks the {@link DeclaredFix} against —
 * everything the host computed off disk (the gauntlet itself reads nothing). The host
 * MEASURES the actual change, the before/after standards surfaces (it read the live
 * surface twice — pre-fix and post-fix), and minted each surface's content address
 * via the ONE `contentAddressOf` kernel.
 */
export interface MeasuredFixReality {
  /** The actual change the host measured (changed files + changed lines). */
  readonly actualChange: ActualChange;
  /** The standards surface elements BEFORE the fix (host-read). */
  readonly standardsBefore: readonly StandardsElement[];
  /** The standards surface elements AFTER the fix (host-read). */
  readonly standardsAfter: readonly StandardsElement[];
  /** The host-minted content address of the BEFORE surface (via `contentAddressOf`). */
  readonly measuredBeforeAddress: string;
  /** The host-minted content address of the AFTER surface (via `contentAddressOf`). */
  readonly measuredAfterAddress: string;
  /** The committed owner sign-offs (the only honest escape) — reused from phase A. */
  readonly signoffs: readonly StandardsWaiver[];
  /** The live always-blocking rule ids — a weakening of one can never be signed. */
  readonly alwaysBlockingRuleIds: ReadonlySet<string>;
  /**
   * The INJECTED wall-clock date the sign-off-expiry is evaluated against (the
   * two-clock law — the host injects it, never `Date.now()` here).
   */
  readonly now: Date;
}

/**
 * VERIFY a declared fix against the host-measured reality — the agent-fix admission
 * control. Runs the four checks (scope ⊆ declared, size ≤ cap, no unsigned weakening
 * reusing phase A, receipt consistency) and returns a {@link FixVerdict}: `admitted`
 * iff ALL pass, else `rejected` with EVERY reason (a fix that creeps scope AND weakens
 * reports both — the report is exhaustive, never first-failure-wins).
 *
 * PURE + DETERMINISTIC: the same (fix, reality) always yields the same verdict. No
 * I/O, no clock read (the host injects `now`), no content-address mint (the host
 * supplies the measured addresses). This is the ONE engine phase B (apply-moment
 * admission) and phase C (the commit gate) both call.
 */
export function verifyDeclaredFix(fix: DeclaredFix, reality: MeasuredFixReality): FixVerdict {
  const reasons: FixRejection[] = [
    ...checkScope(fix, reality.actualChange),
    ...checkSize(fix, reality.actualChange),
    ...checkNoWeakening(
      fix,
      reality.standardsBefore,
      reality.standardsAfter,
      reality.signoffs,
      reality.now,
      reality.alwaysBlockingRuleIds,
    ),
    ...checkReceipts(fix, reality.actualChange, reality.measuredBeforeAddress, reality.measuredAfterAddress),
  ];
  return reasons.length === 0 ? { _tag: 'admitted' } : { _tag: 'rejected', reasons };
}

// ─────────────────────── the host-injected gate facts ───────────────────────

/**
 * The flat DECIDED facts the {@link declaredFixProtocolGate} folds — the HOST has
 * ALREADY run {@link verifyDeclaredFix} (phase B's apply-moment verdict, or a fresh
 * commit-moment verification) and hands the engine the verdict + the declared intent
 * (carried for the report). When NO agent-fix is being validated (a normal commit),
 * the host injects NOTHING and the gate is silent (phase A already guards that path).
 *
 * The same lean-engine shape as {@link StandardsIntegrityFacts}: the host computes,
 * the gate folds.
 */
export interface DeclaredFixFacts {
  /** The declared intent (for the report — so a rejection names what was claimed). */
  readonly intent: string;
  /** The verifier's verdict — the gate folds a `rejected` into blocking Findings. */
  readonly verdict: FixVerdict;
}
