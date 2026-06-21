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
 * The LiteShip `invariant-regex` ORACLE is constructed HERE (the host), not in
 * `@czap/audit`. The audit engine is downstream-installable (ADR-0012) and must
 * reference NO LiteShip-local contract — so its repo-IR builder emits only the
 * STRUCTURAL AST facts (`is-default-export` / `bare-throw`, which any TS repo has)
 * and exposes a `FactOracle` injection hook. The CLI — which legitimately deps
 * `@czap/command` — builds the LiteShip-local oracle from the canonical
 * `NO_DEFAULT_EXPORT` rule and INJECTS it via `extraFactOracles`. The composed IR
 * carries BOTH oracles' facts (the triangulation substrate), but the
 * LiteShip-specific one is host-injected, keeping the boundary clean.
 *
 * @module
 */
import {
  buildRepoIR,
  withRepoRoot,
  liteshipDevopsProfile,
  normalizeRepoPath,
  type FactOracle,
} from '@czap/audit';
import { INVARIANTS, type CheckInvariantEntry } from '@czap/command/invariants';
import { currentEnvFingerprint } from '@czap/command/host';
import { InvariantViolationError } from '@czap/error';
import {
  litelaunchGauntletWithIR,
  type Fact,
  type GauntletResult,
  type LitelaunchCacheOptions,
  type RepoIR,
} from '@czap/gauntlet';
import { gauntletToolchainDigest, makeFsVerdictCache } from './gauntlet-verdict-cache.js';

/**
 * The CANONICAL `NO_DEFAULT_EXPORT` invariant rule — looked up from the committed
 * `INVARIANTS` ledger (`@czap/command`), never hand-copied. The host's
 * `invariant-regex` oracle runs THIS rule's `pattern` + honours THIS rule's
 * `exclude` list, so the text-only oracle is, by construction, the same check the
 * `check-invariants` gate runs — referencing the source of truth, not a fork.
 * Throws a tagged error if the ledger ever drops the rule (a real regression, not
 * a silent skip).
 */
const NO_DEFAULT_EXPORT_RULE: CheckInvariantEntry = (() => {
  const rule = INVARIANTS.find((r) => r.name === 'NO_DEFAULT_EXPORT');
  if (rule === undefined) {
    throw InvariantViolationError(
      'repo-ir-gauntlet',
      'the canonical NO_DEFAULT_EXPORT invariant rule is missing from @czap/command INVARIANTS — the host invariant-regex oracle cannot reference its source of truth',
    );
  }
  return rule;
})();

/**
 * Does `relativePath` fall under one of the rule's `exclude` prefixes? Mirrors the
 * canonical `isExcluded` semantics in `packages/cli/src/commands/check-invariants.ts`
 * EXACTLY (a normalized `.includes(prefix)` substring test), so the oracle excludes
 * the same sanctioned files the real gate does — never a divergent exclusion model.
 */
function ruleExcludes(rule: CheckInvariantEntry, relativePath: string): boolean {
  if (rule.exclude === undefined || rule.exclude.length === 0) return false;
  const normalized = normalizeRepoPath(relativePath);
  return rule.exclude.some((prefix) => normalized.includes(prefix));
}

/**
 * The LiteShip-LOCAL `invariant-regex` (`text-only`) oracle for `is-default-export`,
 * constructed in the HOST (the audit engine stays LiteShip-agnostic — ADR-0012).
 * Runs the CANONICAL `NO_DEFAULT_EXPORT` rule over each file's RAW lines (the
 * committed `pattern`, honouring the committed `exclude`). This is the SECOND
 * oracle the Slice-B cross-check triangulates against audit's AST oracle: it is
 * comment-blind (a textual scan), so where it fires on a comment-occurrence of the
 * keyword pair the AST oracle correctly stays silent — the divergence that proves
 * the text-only oracle should be retired. Excluded files (the sanctioned Astro
 * contract default exports, the rule's own home) emit no regex facts, exactly as
 * the real gate skips them.
 */
export const liteshipRegexOracle: FactOracle = ({ file, text }): readonly Fact[] => {
  if (ruleExcludes(NO_DEFAULT_EXPORT_RULE, file)) return [];
  const facts: Fact[] = [];
  const rawLines = text.split(/\r?\n/);
  for (let i = 0; i < rawLines.length; i++) {
    if (NO_DEFAULT_EXPORT_RULE.pattern.test(rawLines[i] ?? '')) {
      facts.push({
        file,
        line: i + 1,
        property: 'is-default-export',
        value: true,
        oracleId: 'invariant-regex',
        coverageClass: 'text-only',
      });
    }
  }
  return facts;
};

/**
 * Build the repo-IR for the repo at `repoRoot` (the LiteShip reference profile
 * repointed there) WITH the host-injected LiteShip `invariant-regex` oracle. Pure
 * + deterministic — the same source bytes yield an identical IR (the B2 cache
 * invariant). The composed IR carries BOTH the audit AST oracle's `is-default-export`
 * facts (`ts-ast`, file-proxy-only) AND the host regex oracle's (`invariant-regex`,
 * text-only) — the triangulation substrate the divergence gate folds.
 */
export function buildRepoIRForRepo(repoRoot: string): RepoIR {
  return buildRepoIR(withRepoRoot(liteshipDevopsProfile, repoRoot), {
    extraFactOracles: [liteshipRegexOracle],
  });
}

/**
 * Run the production gauntlet over `repoRoot` WITH the repo-IR injected. Builds
 * the IR via `@czap/audit`, then hands it to `litelaunchGauntletWithIR` so every
 * gate's context carries `ir` AND the IR-fold gates run: the regex `no-bare-throw`
 * is re-expressed as the IR-fold `noBareThrowIRGate`, and the live
 * `noDefaultExportDivergenceGate` triangulates the two `is-default-export` oracles
 * (AST vs invariant-regex) — the headline Slice-B cross-check. `now` is the
 * injected wall-clock for waiver expiry (the caller owns the date — never
 * `Date.now()` in here).
 *
 * The lean path (`czap check` over MCP/command, NO IR) keeps calling
 * `litelaunchGauntlet` and runs the six regex gates IR-free — the IR-fold gates
 * appear ONLY here, the IR-present composition.
 */
export function runGauntletWithRepoIR(
  repoRoot: string,
  now: Date,
  globs?: readonly string[],
  cacheOpts: RepoIRGauntletCacheOptions = {},
): GauntletResult {
  const ir = buildRepoIRForRepo(repoRoot);
  const cache = resolveVerdictCache(repoRoot, cacheOpts);
  const effectiveGlobs = globs ?? DEFAULT_GAUNTLET_GLOBS_SENTINEL;
  return effectiveGlobs === DEFAULT_GAUNTLET_GLOBS_SENTINEL
    ? litelaunchGauntletWithIR(repoRoot, now, ir, undefined, cache)
    : litelaunchGauntletWithIR(repoRoot, now, ir, effectiveGlobs, cache);
}

/** Sentinel marking "no explicit globs" so we forward the engine's own default. */
const DEFAULT_GAUNTLET_GLOBS_SENTINEL = Symbol('default-globs');

/** The cache-control knobs the CLI command threads into a repo-IR gauntlet run. */
export interface RepoIRGauntletCacheOptions {
  /**
   * Force a full, uncached run (the `--no-cache` path — mirrors the idempotency
   * `force` flag). When `true`, NO verdict cache is wired: every gate's `run`
   * executes and nothing is read from or written to `.czap/cache/gauntlet`.
   */
  readonly noCache?: boolean;
  /** Cache root override (defaults to `repoRoot`) — pinned in tests. */
  readonly cacheCwd?: string;
}

/**
 * Resolve the {@link LitelaunchCacheOptions} for a run: an ARMED fs cache (store +
 * the toolchain digest + the env fingerprint) UNLESS `--no-cache` is set, in which
 * case an empty options object disarms caching entirely (a full run). The cache is
 * thus defeatable, exactly like the idempotency `force` bypass.
 */
function resolveVerdictCache(repoRoot: string, opts: RepoIRGauntletCacheOptions): LitelaunchCacheOptions {
  if (opts.noCache === true) return {};
  const env = currentEnvFingerprint();
  return {
    cache: makeFsVerdictCache(opts.cacheCwd ?? repoRoot),
    // The anti-lie keystone: a gate-logic edit rebuilds the gauntlet dist → a new
    // toolchain digest → every cached verdict invalidated. Computed once per run.
    toolchainDigest: gauntletToolchainDigest(env),
    env,
  };
}
