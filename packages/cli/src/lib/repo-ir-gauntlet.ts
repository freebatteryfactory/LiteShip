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
  type FileId,
  type GauntletResult,
  type LitelaunchCacheOptions,
  type RepoIR,
} from '@czap/gauntlet';
import { gauntletToolchainDigest, makeFsVerdictCache } from './gauntlet-verdict-cache.js';

/**
 * The PARAMETRIC binding between a canonical `INVARIANTS` rule and the IR property
 * its text-only oracle observes (B3.2). One row drives the generic
 * {@link liteshipRegexOracle} for each of the three triangulated check-invariants:
 *   - `ruleName`: the canonical rule looked up in `INVARIANTS` (never hand-copied).
 *   - `property`: the IR property the regex oracle emits facts under — the SAME
 *     property the audit AST oracle emits, so the divergence gate triangulates.
 *   - `excludedMarkerProperty`: the marker property a policy-EXCLUDED file emits
 *     (the exclude-vs-miss seam) — read by the matching divergence gate.
 * The three rows share ONE oracle code path — the parametric proof.
 */
interface OracleRuleBinding {
  readonly ruleName: string;
  readonly property: string;
  readonly excludedMarkerProperty: string;
}

/**
 * The marker property `NO_DEFAULT_EXPORT`-excluded files emit — exported because
 * the headline divergence gate's tests reference it (the exclude-vs-miss seam).
 */
export const DEFAULT_EXPORT_CHECK_EXCLUDED = 'default-export-check-excluded' as const;

/**
 * The three triangulated check-invariants and the IR property each maps to. All
 * three text-only oracles run through one generic code path (the parametric
 * layer): NO_DEFAULT_EXPORT (B3.1) + NO_VAR + NO_REQUIRE (B3.2). Each property
 * here is also emitted by the audit AST oracle (`repo-ir-build.ts`), so each is a
 * live cross-check.
 */
const ORACLE_RULE_BINDINGS: readonly OracleRuleBinding[] = [
  { ruleName: 'NO_DEFAULT_EXPORT', property: 'is-default-export', excludedMarkerProperty: DEFAULT_EXPORT_CHECK_EXCLUDED },
  { ruleName: 'NO_VAR', property: 'var-declaration', excludedMarkerProperty: 'var-check-excluded' },
  { ruleName: 'NO_REQUIRE', property: 'require-call', excludedMarkerProperty: 'require-check-excluded' },
];

/**
 * Look up a canonical rule from the committed `INVARIANTS` ledger (`@czap/command`),
 * never hand-copied. The host's `invariant-regex` oracle runs THIS rule's `pattern`
 * + honours THIS rule's `exclude` list, so the text-only oracle is, by
 * construction, the same check the `check-invariants` gate runs — referencing the
 * source of truth, not a fork. Throws a tagged error if the ledger ever drops the
 * rule (a real regression, not a silent skip).
 */
function canonicalRule(ruleName: string): CheckInvariantEntry {
  const rule = INVARIANTS.find((r) => r.name === ruleName);
  if (rule === undefined) {
    throw InvariantViolationError(
      'repo-ir-gauntlet',
      `the canonical ${ruleName} invariant rule is missing from @czap/command INVARIANTS — the host invariant-regex oracle cannot reference its source of truth`,
    );
  }
  return rule;
}

/** The resolved canonical rule for each binding (eager — a missing rule fails fast). */
const RESOLVED_RULES: readonly { binding: OracleRuleBinding; rule: CheckInvariantEntry }[] =
  ORACLE_RULE_BINDINGS.map((binding) => ({ binding, rule: canonicalRule(binding.ruleName) }));

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
 * Run ONE canonical rule's text-only scan over a file's raw lines, emitting either
 * the per-line property facts (the regex fired) OR a single file-level
 * policy-EXCLUDE marker (the file is in the rule's `exclude` list — the regex is
 * silent BY DESIGN). The generic per-rule core the three bindings share.
 *
 * The marker (the exclude-vs-miss seam) lets the divergence layer tell a sanctioned
 * exclude (both oracles AGREE; the regex's silence is by design) from a coverage
 * miss. The marker's value names WHICH rule excluded the file (self-describing,
 * never a bare boolean). The oracle already KNOWS the exclude list (it uses it to
 * skip the scan); it ALSO emits the marker so the gate reads the policy exclude
 * from a LIVE fact, never a hardcoded path list (the head-probe LAW).
 */
function scanRule(binding: OracleRuleBinding, rule: CheckInvariantEntry, file: FileId, text: string): readonly Fact[] {
  if (ruleExcludes(rule, file)) {
    return [
      {
        file,
        line: 1,
        property: binding.excludedMarkerProperty,
        value: rule.name,
        oracleId: 'invariant-regex',
        coverageClass: 'text-only',
      },
    ];
  }
  const facts: Fact[] = [];
  const rawLines = text.split(/\r?\n/);
  for (let i = 0; i < rawLines.length; i++) {
    if (rule.pattern.test(rawLines[i] ?? '')) {
      facts.push({
        file,
        line: i + 1,
        property: binding.property,
        value: true,
        oracleId: 'invariant-regex',
        coverageClass: 'text-only',
      });
    }
  }
  return facts;
}

/**
 * The LiteShip-LOCAL `invariant-regex` (`text-only`) oracle, constructed in the
 * HOST (the audit engine stays LiteShip-agnostic — ADR-0012). It runs ALL THREE
 * canonical triangulated rules — NO_DEFAULT_EXPORT, NO_VAR, NO_REQUIRE — over each
 * file's RAW lines (each rule's committed `pattern`, honouring its committed
 * `exclude`), through ONE generic per-rule code path (the parametric proof). It is
 * the SECOND oracle every Slice-B cross-check triangulates against audit's AST
 * oracle: it is comment-blind (a textual scan), so where it fires on a comment- or
 * string-occurrence of a banned keyword the AST oracle correctly stays silent — the
 * divergence that proves the text-only oracle should be retired.
 *
 * For each rule, an excluded file emits no property facts but DOES emit that rule's
 * distinct policy-EXCLUDE marker (the exclude-vs-miss seam), so the divergence
 * layer can tell a sanctioned exclude from a coverage miss.
 */
export const liteshipRegexOracle: FactOracle = ({ file, text }): readonly Fact[] => {
  const facts: Fact[] = [];
  for (const { binding, rule } of RESOLVED_RULES) {
    for (const fact of scanRule(binding, rule, file, text)) facts.push(fact);
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
export function buildRepoIRForRepo(repoRoot: string, withSymbolReferences = false): RepoIR {
  return buildRepoIR(withRepoRoot(liteshipDevopsProfile, repoRoot), {
    extraFactOracles: [liteshipRegexOracle],
    withSymbolReferences,
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
  const withSymbols = cacheOpts.withSymbolReferences === true;
  const ir = buildRepoIRForRepo(repoRoot, withSymbols);
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
  /**
   * Run the heavy symbol-evidenced LanguageService oracle (B3.3 — `czap check
   * --ir --symbols`). It changes the IR's facts (the symbol-orphan gate's input),
   * so the verdict cache is NAMESPACED by this mode (see {@link resolveVerdictCache}):
   * a symbols-on verdict can never be served to a symbols-off run, or vice versa.
   */
  readonly withSymbolReferences?: boolean;
}

/**
 * Resolve the {@link LitelaunchCacheOptions} for a run: an ARMED fs cache (store +
 * the toolchain digest + the env fingerprint) UNLESS `--no-cache` is set, in which
 * case an empty options object disarms caching entirely (a full run). The cache is
 * thus defeatable, exactly like the idempotency `force` bypass.
 */
function resolveVerdictCache(repoRoot: string, opts: RepoIRGauntletCacheOptions): LitelaunchCacheOptions {
  if (opts.noCache === true) return {};
  // The IR-build MODE is part of the cache key: --symbols changes the IR's facts
  // (and so the symbol-orphan gate's verdict) WITHOUT changing any file's content
  // digest, so it must namespace the key — otherwise a symbols-off verdict could be
  // served to a symbols-on run (a stale-serve LIE). Folding it into `env` (which the
  // engine's gateVerdictKey already incorporates) is the minimal sound fix.
  const env = {
    ...currentEnvFingerprint(),
    ...(opts.withSymbolReferences === true ? { irMode: 'symbols' } : {}),
  };
  return {
    cache: makeFsVerdictCache(opts.cacheCwd ?? repoRoot),
    // The anti-lie keystone: a gate-logic edit rebuilds the gauntlet dist → a new
    // toolchain digest → every cached verdict invalidated. Computed once per run.
    toolchainDigest: gauntletToolchainDigest(env),
    env,
  };
}
