/**
 * The HOST injection path (Slice B, B1) — build the repo-IR with `@czap/audit`
 * and run the gauntlet with it injected.
 *
 * This is the CLI-only wiring that materializes the gauntlet's `RepoIR` (the
 * heavy `ts.Program` parse lives in `@czap/audit`) and threads it into
 * `litelaunchGauntlet`. It is the SAME injected-capability pattern as
 * `audit-floor.ts`'s `runAuditFloor`: `@czap/command` and `@czap/mcp-server`
 * stay LEAN (their `czap check` path runs `litelaunchGauntlet` with NO IR — the
 * regex gates run, and an IR-fold gate folds only when an IR is present), while
 * the CLI — which already deps `@czap/audit` — is the one adapter that can build
 * and inject the IR.
 *
 * @module
 */
import { buildRepoIR, withRepoRoot, liteshipDevopsProfile } from '@czap/audit';
import { litelaunchGauntlet, type GauntletResult, type RepoIR } from '@czap/gauntlet';

/**
 * Build the repo-IR for the repo at `repoRoot` (the LiteShip reference profile
 * repointed there). Pure + deterministic — the same source bytes yield an
 * identical IR (the B2 cache invariant).
 */
export function buildRepoIRForRepo(repoRoot: string): RepoIR {
  return buildRepoIR(withRepoRoot(liteshipDevopsProfile, repoRoot));
}

/**
 * Run the production gauntlet over `repoRoot` WITH the repo-IR injected. Builds
 * the IR via `@czap/audit`, then hands it to `litelaunchGauntlet` so every
 * gate's context carries `ir`. `now` is the injected wall-clock for waiver
 * expiry (the caller owns the date — never `Date.now()` in here).
 */
export function runGauntletWithRepoIR(
  repoRoot: string,
  now: Date,
  globs?: readonly string[],
): GauntletResult {
  const ir = buildRepoIRForRepo(repoRoot);
  return litelaunchGauntlet(repoRoot, now, globs ?? undefined, ir);
}
