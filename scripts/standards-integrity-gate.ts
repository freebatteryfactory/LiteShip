/**
 * The STANDARDS-INTEGRITY GATE — the raccoon-rule backstop run OVER THE REAL REPO.
 *
 * The agent-safety meta-gauntlet ("the repairman may be a raccoon with commit
 * access") is exercised in unit tests with a hermetic, INJECTED `gitShow`
 * (`tests/unit/cli/lib/repo-ir-gauntlet.test.ts`). That proves the FOLD logic — but
 * a correct gate that nothing runs over the real repo is still a hole. This script
 * closes it: it runs the SAME host extractor the production `czap check --ir` path
 * runs ({@link buildStandardsIntegrityFacts}) over the LIVE repo, through the REAL
 * base-ref path:
 *
 *   resolveStandardsBaseRef(env)  →  the deterministic precedence
 *     CZAP_STANDARDS_BASE_REF → GITHUB_BASE_REF → main
 *   readBaseSnapshot(repo, base, defaultGitShow)  →  `git show <base>:…` (NO injection)
 *
 * so the diff is the LIVE standards surface against the PRIOR, INDEPENDENT baseline
 * AS COMMITTED ON THE BASE the change is reviewed against — never the working-tree
 * snapshot (the same-commit cover-up bypass we are closing).
 *
 * THE BLOCKING SET is read from the SAME partitioned facts the lean
 * `standardsIntegrityGate` folds into Findings — the gate maps exactly these three
 * arrays to `severity: 'error'` (blocking):
 *   - `unsignedWeakenings` — a standard eroded without an owner sign-off;
 *   - `forbiddenSignoffs`  — a sign-off that tried to authorize removing an
 *     always-blocking rule (you cannot sign away a lie);
 *   - `expiredSignoffs`    — a sign-off whose calendar expiry has passed.
 * A `signedWeakening` (a valid, in-date sign-off) is `advisory` and a stale
 * `unregeneratedStrengthen` is a `warning` — surfaced, never fatal. Reading the
 * facts directly keeps this script at the CLI's `standards-surface.js` boundary (it
 * needs no `@czap/gauntlet` symlink at the repo root) while gating on the EXACT
 * partition the gate blocks on.
 *
 * FAIL-CLOSED, BUT BOOTSTRAP-AWARE: a CONFIG ERROR — the base SHOULD carry the snapshot
 * (the snapshot's introduction commit IS an ancestor of the base) but it could not be read
 * (unfetched / wrong path) — makes {@link buildStandardsIntegrityFacts} THROW (the tagged
 * `InvariantViolation`), so this gate REFUSES rather than passes; it never silently falls
 * back to the working-tree snapshot. But GENESIS — the base PREDATES the snapshot's very
 * existence (its introduction commit is NOT an ancestor of the base, e.g. the bootstrap PR
 * vs main where the snapshot was born on the branch) — is NOT a config error: there is
 * genuinely no prior baseline to diff against, so the backstop is INACTIVE (a LOUD pass,
 * never a silent green — you cannot sneak a weakening past a baseline that does not exist).
 * It activates once the base carries the snapshot (post-merge). CI fetches enough history
 * and sets `CZAP_STANDARDS_BASE_REF` to the review base (see ci.yml); a base that has the
 * snapshot runs the normal diff, one that predates it is inactive, one that should have it
 * but lacks it fails closed.
 *
 * `now` is the wall-clock (the two-clock law — the sign-off-expiry calendar
 * comparison reads the wall clock, never `systemClock`).
 *
 * @module
 */

import { repoRoot } from '../vitest.shared.js';
import {
  buildStandardsIntegrityFacts,
  resolveStandardsBaseRef,
} from '../packages/cli/src/lib/standards-surface.js';
import { isDirectExecution } from './audit/shared.js';

export interface StandardsGateOutcome {
  /**
   * The activation state of the backstop:
   *  - `active`: the base ref carried the snapshot → the diff ran (the counts below apply).
   *  - `inactive`: the base PREDATES the snapshot's existence (genesis) → no prior baseline
   *    → a LOUD pass (NOT a silent green; the `message` says so). The counts are all 0.
   */
  readonly state: 'active' | 'inactive';
  /** The base ref the LIVE surface was diffed against (the deterministic resolution). */
  readonly baseRef: string;
  /** When `inactive`: the loud, self-explaining activation message; empty when `active`. */
  readonly message: string;
  /** The base snapshot's content address (the prior, reviewed-against ground truth). */
  readonly baseAddress: string;
  /** The live surface's content address. */
  readonly liveAddress: string;
  /** The unsigned weakenings (BLOCKING) — a standard eroded without an owner sign-off. */
  readonly unsignedWeakenings: number;
  /** The forbidden sign-offs (BLOCKING) — a sign-off over an always-blocking rule. */
  readonly forbiddenSignoffs: number;
  /** The expired sign-offs (BLOCKING) — a sign-off whose expiry has passed. */
  readonly expiredSignoffs: number;
  /** The signed weakenings (advisory) + stale strengthens (warning) — surfaced, not fatal. */
  readonly signedWeakenings: number;
  readonly unregeneratedStrengthens: number;
}

/**
 * Run the raccoon-rule backstop over `root` through the REAL base-ref path; return a
 * flat outcome (the blocking arrays the gate maps to `error`-severity findings).
 * Uses the default `defaultGitShow` (a real `git show <base>:…`, NEVER an injected
 * hermetic reader) — FAIL-CLOSED on an unresolvable base config error (a tagged throw from
 * {@link buildStandardsIntegrityFacts}), but BOOTSTRAP-AWARE: a base that predates the
 * snapshot's existence (genesis) returns the `inactive` outcome (a loud pass), never a
 * throw and never a silent green.
 */
export function runStandardsIntegrityGate(root = repoRoot, now: Date = new Date()): StandardsGateOutcome {
  const baseRef = resolveStandardsBaseRef();
  const result = buildStandardsIntegrityFacts(root, now);
  if (result._tag === 'inactive') {
    return {
      state: 'inactive',
      baseRef: result.baseRef,
      message: result.message,
      baseAddress: '',
      liveAddress: '',
      unsignedWeakenings: 0,
      forbiddenSignoffs: 0,
      expiredSignoffs: 0,
      signedWeakenings: 0,
      unregeneratedStrengthens: 0,
    };
  }
  const facts = result.facts;
  return {
    state: 'active',
    baseRef,
    message: '',
    baseAddress: facts.committedAddress,
    liveAddress: facts.liveAddress,
    unsignedWeakenings: facts.unsignedWeakenings.length,
    forbiddenSignoffs: facts.forbiddenSignoffs.length,
    expiredSignoffs: facts.expiredSignoffs.length,
    signedWeakenings: facts.signedWeakenings.length,
    unregeneratedStrengthens: facts.unregeneratedStrengthens.length,
  };
}

export function main(root = repoRoot): void {
  const outcome = runStandardsIntegrityGate(root);

  // BOOTSTRAP-AWARE: the snapshot was born on a feature branch and does NOT exist on the
  // review base yet (e.g. the bootstrap PR vs main). The base predates the snapshot's very
  // existence → there is no prior baseline to diff against → the backstop is INACTIVE. This
  // is NOT a hole: you cannot sneak a weakening past a baseline that does not exist. Emit
  // the loud message and PASS. The backstop activates once the base carries the snapshot
  // (post-merge), at which point a future weakening vs that base is caught.
  if (outcome.state === 'inactive') {
    console.log(`standards-integrity: ${outcome.message}`);
    console.log('Standards-integrity gate passed (INACTIVE) — no prior baseline at the base ref to guard yet.');
    return;
  }

  console.log(
    `standards-integrity: diffing the LIVE surface (${outcome.liveAddress}) against base "${outcome.baseRef}" (${outcome.baseAddress}).`,
  );
  if (outcome.signedWeakenings > 0) {
    console.log(`  [advisory] ${outcome.signedWeakenings} signed weakening(s) (an in-date owner sign-off) — recorded, not fatal.`);
  }
  if (outcome.unregeneratedStrengthens > 0) {
    console.log(`  [warning] ${outcome.unregeneratedStrengthens} stale strengthen(s) — regenerate the committed snapshot.`);
  }

  const blocking = outcome.unsignedWeakenings + outcome.forbiddenSignoffs + outcome.expiredSignoffs;
  if (blocking > 0) {
    console.error(
      `FAIL standards-integrity: ${outcome.unsignedWeakenings} unsigned weakening(s), ${outcome.forbiddenSignoffs} forbidden sign-off(s), ${outcome.expiredSignoffs} expired sign-off(s) vs the base ref "${outcome.baseRef}".`,
    );
    throw new Error(
      `Standards-integrity gate failed — ${blocking} blocking standards-integrity finding(s). The raccoon-rule backstop refuses: the gauntlet's own rigor was eroded versus the base without a valid owner sign-off. Run \`czap check --ir\` for the per-finding detail.`,
    );
  }

  console.log('Standards-integrity gate passed — no unsigned weakening of the standards vs the base ref.');
}

if (isDirectExecution(import.meta.url)) {
  main();
}
