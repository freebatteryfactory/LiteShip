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
 * FAIL-CLOSED: an unresolvable base ref / an absent baseline snapshot at that ref
 * makes {@link buildStandardsIntegrityFacts} THROW (the tagged `InvariantViolation`),
 * so this gate REFUSES rather than passes — it never silently falls back to the
 * working-tree snapshot. CI must therefore fetch enough history and set
 * `CZAP_STANDARDS_BASE_REF` to a ref that HAS the snapshot (see ci.yml).
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
  /** The base ref the LIVE surface was diffed against (the deterministic resolution). */
  readonly baseRef: string;
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
 * hermetic reader) — FAIL-CLOSED on an unresolvable base (a tagged throw from
 * {@link buildStandardsIntegrityFacts}).
 */
export function runStandardsIntegrityGate(root = repoRoot, now: Date = new Date()): StandardsGateOutcome {
  const baseRef = resolveStandardsBaseRef();
  const facts = buildStandardsIntegrityFacts(root, now);
  return {
    baseRef,
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
