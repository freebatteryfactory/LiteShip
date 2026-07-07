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
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildRepoIR,
  withRepoRoot,
  liteshipDevopsProfile,
  normalizeRepoPath,
  detectSkipsAST,
  codeOnlyAST,
  type FactOracle,
} from '@czap/audit';
import { INVARIANTS, type CheckInvariantEntry } from '@czap/command/invariants';
import { currentEnvFingerprint } from '@czap/command/host';
import { InvariantViolationError } from '@czap/error';
import {
  buildMutationFacts,
  buildMcdcFacts,
  makeEquivalentMutantRegistry,
  parseEquivalentMutants,
  buildRepoIRTaint,
  buildCapabilityLinkFacts,
  buildActiveSurfaceFacts,
  type EquivalentMutantRegistry,
} from '@czap/audit';
import { LITESHIP_TRANSITION_REQUIRED_FIELDS } from './active-surface-policy.js';
import { LITESHIP_TAINT_REGISTRY } from './taint-policy.js';
import { LITESHIP_CAPABILITY_MODULES, LITESHIP_CAPABILITY_IDS, resolveCapabilitySites } from './capability-policy.js';
import {
  litelaunchGauntletWithIR,
  supplyChainGate,
  mutationDivergenceGate,
  mcdcCoverageGate,
  simulationDeterminismGate,
  traceabilityBridgeGate,
  standardsIntegrityGate,
  taintFlowGate,
  capabilityGateLinkGate,
  proofPropagationGate,
  compositionCoverageGate,
  activeModeledSurfaceReaderGate,
  LITESHIP_IR_GATES,
  type Fact,
  type FileId,
  type Gate,
  type GauntletResult,
  type LitelaunchCacheOptions,
  type McdcFacts,
  type MutationFacts,
  type RepoIR,
  type SimulationFacts,
  type SupplyChainFacts,
  type TaintFacts,
  type CapabilityLinkFacts,
  type TraceabilityFacts,
  type StandardsIntegrityFacts,
  type ProofFacts,
  type CompositionFacts,
  type ActiveSurfaceFacts,
} from '@czap/gauntlet';
import { buildProofFacts, buildCompositionFacts } from './local-vs-global.js';
import { buildTraceabilityFacts } from './traceability.js';
import { buildStandardsIntegrityFacts, type StandardsFactsOptions } from './standards-surface.js';
import { runSimulationCorpus } from './simulation-corpus.js';
import { gauntletToolchainDigest, makeFsVerdictCache, makeFsMutantVerdictCache } from './gauntlet-verdict-cache.js';
import { makeVitestMutationRunner } from './mutation-runner.js';
import { l4SeamTargets, buildSeamCoverageMap } from './mutation-targets.js';
import { makeFsSeamCoverageProbeCache, type SeamExecutionCoverageOptions } from './seam-execution-coverage.js';
import { readWorkspacePackages, type WorkspacePackageIdentity } from './workspace.js';
import { analyzeSupplyChain, type WorkspacePkg } from './supply-chain.js';

/**
 * The CLEAN {@link StandardsIntegrityFacts} folded when the raccoon-rule backstop is
 * INACTIVE (the base ref predates the snapshot's existence — genesis). Zero weakenings
 * (the gate folds to no findings) with a sentinel address that NAMES the inactive reason,
 * so the report's drift keystone shows the backstop did not diff (not a false "addresses
 * match"). NOT a silent pass: the host also logs the loud activation message.
 */
function inactiveStandardsFacts(message: string): StandardsIntegrityFacts {
  const sentinel = `inactive:${message}`;
  return {
    unsignedWeakenings: [],
    signedWeakenings: [],
    unregeneratedStrengthens: [],
    forbiddenSignoffs: [],
    expiredSignoffs: [],
    committedAddress: sentinel,
    liveAddress: sentinel,
  };
}

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
  {
    ruleName: 'NO_DEFAULT_EXPORT',
    property: 'is-default-export',
    excludedMarkerProperty: DEFAULT_EXPORT_CHECK_EXCLUDED,
  },
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
const RESOLVED_RULES: readonly { binding: OracleRuleBinding; rule: CheckInvariantEntry }[] = ORACLE_RULE_BINDINGS.map(
  (binding) => ({ binding, rule: canonicalRule(binding.ruleName) }),
);

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
export async function runGauntletWithRepoIR(
  repoRoot: string,
  now: Date,
  globs?: readonly string[],
  cacheOpts: RepoIRGauntletCacheOptions = {},
): Promise<GauntletResult> {
  const withSymbols = cacheOpts.withSymbolReferences === true;
  const ir = buildRepoIRForRepo(repoRoot, withSymbols);
  const cache = resolveVerdictCache(repoRoot, cacheOpts);

  // Each avionics opt-in composes its gate onto the IR-host set + injects its facts
  // for THIS run only. WITHOUT an opt-in the gate is not in the set (no facts cost,
  // no `not-evidenced`/mutation noise on the default `--ir` run). The gate set
  // ACCUMULATES (`--supply-chain`, `--mutate`, and `--simulate` may be on at once),
  // starting from the lean IR-host set; the facts are folded onto the launch options.
  const gateSet: Gate[] = [...LITESHIP_IR_GATES];
  let supplyChainFacts: SupplyChainFacts | undefined;
  let mutationFacts: MutationFacts | undefined;
  let mcdcFacts: McdcFacts | undefined;
  let simulationFacts: SimulationFacts | undefined;
  let taintFacts: TaintFacts | undefined;
  let capabilityLinkFacts: CapabilityLinkFacts | undefined;
  let proofFacts: ProofFacts | undefined;
  let compositionFacts: CompositionFacts | undefined;

  // The requirements-traceability ledger (the avionics-tier bidirectional trace) is
  // ALWAYS-ON on the `--ir` path: the committed `traceability/*.yaml` is cheap to fold
  // (a YAML parse + a corpus header scan, no test runs) and complete enough that it
  // never spuriously fails (only invariants with a REAL proving test are enrolled).
  // The host parses the ledger, scans the corpus for `// PROVES:` headers, runs the
  // lifecycle state machine against the injected wall-clock `now` (the two-clock law),
  // and injects the decided facts for `traceabilityBridgeGate` to fold. An untraced
  // invariant, an expired waiver, or a ledger⇔header divergence reds the gate.
  gateSet.push(traceabilityBridgeGate);
  const traceabilityFacts: TraceabilityFacts = buildTraceabilityFacts(repoRoot, now);

  // The AGENT-SAFETY META-GAUNTLET (the "raccoon rule", phase A) is ALSO ALWAYS-ON on
  // the `--ir` path: the host reads the LIVE standards surface (the gauntlet's own rigor
  // config off its exports + the committed benchmarks/traceability artifacts),
  // content-addresses it, diffs it against the committed snapshot, applies the owner
  // sign-offs against the injected wall-clock `now` (the two-clock law), and injects the
  // decided facts for `standardsIntegrityGate` to fold. An UNSIGNED weakening of the
  // standards (a removed gate, reduced fixtures, lowered floor/level, a new/extended
  // waiver, a removed/lowered invariant) BLOCKS — the UNCONDITIONAL COMMIT BACKSTOP that
  // catches a silent erosion regardless of who/how it landed. It is cheap to fold (a
  // content-address + a diff, no test runs), so it rides the always-on path with
  // traceability.
  gateSet.push(standardsIntegrityGate);
  // BOOTSTRAP-AWARE: the backstop is INACTIVE when the base ref PREDATES the snapshot's
  // existence (genesis — e.g. a PR vs main where the snapshot was born on the branch).
  // There is no prior baseline to diff against, so we fold to CLEAN facts (no findings) and
  // emit the loud message — never a silent pass, and never a fail-closed for a base that
  // genuinely cannot carry the snapshot yet. A true config error (base SHOULD have it but
  // could not be read) still THROWS inside buildStandardsIntegrityFacts (fail-closed).
  const standardsResult = buildStandardsIntegrityFacts(repoRoot, now, cacheOpts.standards);
  const standardsFacts: StandardsIntegrityFacts =
    standardsResult._tag === 'active' ? standardsResult.facts : inactiveStandardsFacts(standardsResult.message);
  if (standardsResult._tag === 'inactive') {
    // Surface the bootstrap activation notice LOUDLY (stderr) — the same channel the
    // mutate/mcdc seam-skip notices use; never a quiet drop, never a finding.
    process.stderr.write(`[standards-integrity] ${standardsResult.message}\n`);
  }

  // The `--supply-chain` opt-in (Slice C): compute the heavy SupplyChainFacts in the
  // HOST (lockfile parse + SBOM + CI scan), inject them, compose `supplyChainGate`.
  if (cacheOpts.withSupplyChain === true) {
    gateSet.push(supplyChainGate);
    supplyChainFacts = analyzeRepoSupplyChain(repoRoot);
  }

  // The `--mutate` opt-in (Slice C, mutation-as-divergence): generate the deterministic
  // mutants over the LIVE effective-L4 trust-spine seams, evaluate each via the
  // per-mutant vitest runner (the in-place mutate + isolated subprocess + verified
  // restore), and fold the verdicts into the injected facts; compose
  // `mutationDivergenceGate`. The mutation cache mode is namespaced in the toolchain
  // digest (see resolveVerdictCache) so a mutation verdict never serves a non-mutation
  // run. This is HEAVY (a covering-test suite run per mutant) — the budget caps the
  // per-file catalogue and the cannon is aimed at the trust spine only.
  if (cacheOpts.withMutate === true) {
    gateSet.push(mutationDivergenceGate);
    mutationFacts = buildRepoMutationFacts(repoRoot, ir, cache.toolchainDigest);
  }

  // The `--mcdc` opt-in (DO-178B Level A's Modified Condition/Decision Coverage via
  // CONDITION-LEVEL MUTATION): over the LIVE effective-L4 trust-spine seams, decompose
  // each decision into its atomic conditions, mint the force-true/force-false pin per
  // condition, evaluate each pin via the SAME per-mutant vitest runner (in-place pin +
  // isolated subprocess + verified restore), and fold the two pins per condition into the
  // injected facts; compose `mcdcCoverageGate`. A condition whose independent effect is
  // not observed (a surviving pin) is an MC/DC gap the gate surfaces (L4 demands full
  // MC/DC). The MC/DC cache mode is namespaced in the toolchain digest (see
  // resolveVerdictCache) so an MC/DC verdict never serves a non-MC/DC run. This is HEAVY
  // (a covering-test suite run per pin, TWO pins per condition) — aimed at the trust
  // spine only.
  if (cacheOpts.withMcdc === true) {
    gateSet.push(mcdcCoverageGate);
    mcdcFacts = buildRepoMcdcFacts(repoRoot, ir, cache.toolchainDigest);
  }

  // The `--simulate` opt-in (the determinism spine, DST going LIVE): drive the
  // committed scenario corpus — REAL L4 trust-spine SUTs (content-address / HLC /
  // graph-patch / boundary-evaluator) — through the seeded `@czap/core/simulation`
  // world, replaying each seed TWICE and comparing the two byte-exact trace digests.
  // A deterministic pair CERTIFIES byte-exact reproducibility (the positive result);
  // a divergence is a REAL nondeterminism bug surfaced honestly (never fake-passed).
  // The verdicts fold into the injected facts; compose `simulationDeterminismGate`.
  // The simulation cache mode is namespaced in the toolchain digest (see
  // resolveVerdictCache) so a simulation verdict never serves a non-simulation run.
  if (cacheOpts.withSimulate === true) {
    gateSet.push(simulationDeterminismGate);
    simulationFacts = await runSimulationCorpus();
  }

  // The `--taint` opt-in (the TAINT-ANALYSIS family): trace the source→sink dataflow
  // in the HOST via @czap/audit's GENERIC taint oracle, classified by the
  // LiteShip-LOCAL source/sink/sanitizer registry injected HERE (the ADR-0012 / D7b
  // boundary — the audit engine references no LiteShip source/sink name). An
  // UNSANITIZED flow (an untrusted fetch/AI-cast/runtime-URL value reaching a
  // shader-compile / innerHTML / graph-apply / fetch sink with no sanitizer on the
  // path) is folded into a finding by `taintFlowGate`; a sanitized flow is clean. The
  // trace is a WHOLE-CORPUS ts.Program + checker walk (HEAVY) — opt-in. The taint
  // cache mode is namespaced in the toolchain digest (see resolveVerdictCache) so a
  // taint-run verdict never serves a non-taint run. The honest bounded interprocedural
  // depth is carried in the facts (the report states what was and was not traced).
  if (cacheOpts.withTaint === true) {
    gateSet.push(taintFlowGate);
    taintFacts = buildRepoIRTaint(LITESHIP_TAINT_REGISTRY, { profile: withRepoRoot(liteshipDevopsProfile, repoRoot) });
  }

  // The `--capability-gate` opt-in (codex round-8, #1b — the capability-link dataflow proof). The host
  // resolves each sanctioned skip's guard against the canonical capability symbol table (the
  // LiteShip-LOCAL module SET + ids, injected — the audit oracle names no capability) and proves it
  // DERIVES FROM its declared capability's probe; an unrelated / mislabeled guard folds into a finding
  // via `capabilityGateLinkGate`. It builds a ts.Program over the sanctioned files + capability modules
  // (opt-in). The capability-gate cache mode is namespaced in the toolchain digest (see
  // resolveVerdictCache) so a capability-gate verdict never serves a non-capability-gate run.
  if (cacheOpts.withCapabilityGate === true) {
    gateSet.push(capabilityGateLinkGate);
    capabilityLinkFacts = buildCapabilityLinkFacts({
      repoRoot,
      capabilityModules: LITESHIP_CAPABILITY_MODULES,
      capabilityIds: LITESHIP_CAPABILITY_IDS,
      sites: resolveCapabilitySites(repoRoot),
    });
  }

  // The `--proof` opt-in (the LOCAL-VS-GLOBAL correctness family — the lax-functor):
  // read the proof SIGNALS (the committed mutation-score ratchet, the coverage report,
  // per-file property-test presence, the enrolled-invariant ledger), blend them into a
  // per-module proof scalar in the HOST, and inject the facts; compose
  // `proofPropagationGate`. The gate propagates the scalar along the IR's dep DAG (the
  // `min`-fixpoint dual of assurance propagation) and reports each trust-spine module
  // whose GLOBAL proof drops below its level floor BECAUSE of a weak dependency. The
  // proof cache mode is namespaced (see resolveVerdictCache) so a proof-run verdict
  // never serves a non-proof run. LIGHT (a few artifact reads + a corpus scan — no test
  // runs), but opt-in so the default `--ir` run carries no `not-evidenced` advisory.
  if (cacheOpts.withProof === true) {
    gateSet.push(proofPropagationGate);
    proofFacts = buildProofFacts(repoRoot, ir);
  }

  // The `--composition` opt-in (the LOCAL-VS-GLOBAL correctness family — "locally green,
  // globally untested interaction"): derive the interaction edges from the IR call/import
  // graph (a file→file dependency where BOTH endpoints are individually tested), classify
  // each integration-covered iff a single test references both (the SOUND static-reference
  // over-approximation, the honest limit the gate carries), and inject the facts; compose
  // `compositionCoverageGate`. An UNCOVERED L4 interaction edge is the finding. The
  // composition cache mode is namespaced (see resolveVerdictCache). LIGHT (a corpus scan
  // over the IR edges — no test runs), opt-in so the default run carries no advisory.
  if (cacheOpts.withComposition === true) {
    gateSet.push(compositionCoverageGate);
    compositionFacts = buildCompositionFacts(repoRoot, ir);
  }

  // The active-surface field-read oracle (#132) is ALWAYS-ON on the `--ir` path:
  // the host scans enrolled reader paths with TS-AST (cheap) and injects facts for
  // `activeModeledSurfaceReaderGate`. Live TransitionNode field-read orphan is BLOCKING on `--ir`.
  gateSet.push(activeModeledSurfaceReaderGate);
  const activeSurfaceFacts: ActiveSurfaceFacts = buildActiveSurfaceFacts({
    repoRoot,
    promotion: 'blocking',
    transitionRequiredFields: LITESHIP_TRANSITION_REQUIRED_FIELDS,
  });

  const launchOpts: LitelaunchCacheOptions = {
    ...cache,
    // The SOUND AST skip detector — ALWAYS-ON on the `--ir` path (the host deps `@czap/audit`, the
    // `ts.createSourceFile` parse is cheap). The no-skipped-test gate uses it via
    // `(context.skipDetector ?? detectSkips)`, gaining line-agnostic multi-line/ASI/inner-describe
    // detection + the structural F2 conditionality the token scanner cannot produce — the cure that
    // ends the token-scanner whack-a-mole. The lean `czap check`/MCP path keeps the token fallback.
    skipDetector: detectSkipsAST,
    // The SOUND scanner `codeOnly` floor — same always-on `--ir` injection. Code-scanning gates
    // (no-bare-throw, no-nondeterminism, no-silent-catch) use it via `(context.codeOnly ?? codeOnly)`,
    // a real parser tokenization (regex-vs-division, nested templates) over the char-machine fallback
    // — pinned equivalent by tests/unit/audit/code-ranges.test.ts.
    codeOnly: codeOnlyAST,
    // The gate set ALWAYS carries `traceabilityBridgeGate` (always-on) plus any
    // opt-in gates, so it always exceeds the bare LITESHIP_IR_GATES set — the engine
    // runs exactly this composed set, never its own default. (The default is now only
    // used by the lean `litelaunchGauntletWithIR` callers that pass no gate override.)
    gates: gateSet,
    traceability: traceabilityFacts,
    standards: standardsFacts,
    ...(supplyChainFacts !== undefined ? { supplyChain: supplyChainFacts } : {}),
    ...(mutationFacts !== undefined ? { mutation: mutationFacts } : {}),
    ...(mcdcFacts !== undefined ? { mcdc: mcdcFacts } : {}),
    ...(simulationFacts !== undefined ? { simulation: simulationFacts } : {}),
    ...(taintFacts !== undefined ? { taint: taintFacts } : {}),
    ...(capabilityLinkFacts !== undefined ? { capabilityLink: capabilityLinkFacts } : {}),
    ...(proofFacts !== undefined ? { proof: proofFacts } : {}),
    ...(compositionFacts !== undefined ? { composition: compositionFacts } : {}),
    activeSurfaceFacts,
  };
  const effectiveGlobs = globs ?? DEFAULT_GAUNTLET_GLOBS_SENTINEL;
  return effectiveGlobs === DEFAULT_GAUNTLET_GLOBS_SENTINEL
    ? litelaunchGauntletWithIR(repoRoot, now, ir, undefined, launchOpts)
    : litelaunchGauntletWithIR(repoRoot, now, ir, effectiveGlobs, launchOpts);
}

/**
 * The per-mutant mutant-budget cap (the seeded deterministic prefix the engine
 * samples). Bounds the suite-runs-per-seam for a tractable first live run — the
 * cannon is aimed (the trust-spine seams) and budgeted (a sample per file), never
 * sprayed. Owner-redlinable: raise it to widen the per-file catalogue as the score
 * ratchet climbs.
 */
const MUTATION_BUDGET_PER_FILE = 12;

/** The committed mutation-score baseline (the ratchet floor) — repo-relative. */
const MUTATION_SCORE_BASELINE = 'benchmarks/mutation-score.json';

/** The committed equivalent-mutant registry (the justified non-gaps) — repo-relative. */
const MUTATION_EQUIVALENTS = 'benchmarks/mutation-equivalents.json';

/**
 * Build the {@link MutationFacts} the avionics `mutationDivergenceGate` folds — the
 * HOST's heavy job (Slice C, mutation-as-divergence):
 *   1. Compute the LIVE effective-L4 seam targets from the IR's propagation fixpoint
 *      ({@link l4SeamTargets} — the level is computed from the live IR, never a
 *      hardcoded list beside the file).
 *   2. Build the SOUND covering-tests map ({@link buildSeamCoverageMap} — the
 *      over-approximating deep-import ∪ barrel-import closure; under-mapping yields
 *      false survivors, so it errs toward running too many tests).
 *   3. For each seam, generate the deterministic mutants (budget-capped), evaluate
 *      each via the per-mutant vitest runner (in-place mutate → isolated subprocess →
 *      VERIFIED restore), and fold the verdicts into the flat facts.
 * The runner is constructed per-target-file (each instance mutates exactly its file).
 * The committed score baseline arms the ratchet (a DROP is a regression finding); on
 * the first run the baseline file may be absent → an empty baseline (no ratchet,
 * just the survivor surfacing).
 */
function buildRepoMutationFacts(repoRoot: string, ir: RepoIR, toolchainDigest: string | undefined): MutationFacts {
  const { targets, skippedNotL4, unreadable } = l4SeamTargets(ir, repoRoot);
  // Surface a vanished/demoted seam LOUDLY (stderr) rather than silently dropping it —
  // a candidate the live map no longer rates L4, or whose bytes vanished, is drift the
  // owner must see (never a quiet hole in the trust-spine coverage).
  for (const f of skippedNotL4) {
    process.stderr.write(`czap check --mutate: seam candidate "${f}" is no longer effective-L4 (skipped)\n`);
  }
  for (const f of unreadable) {
    process.stderr.write(`czap check --mutate: seam candidate "${f}" could not be read (skipped)\n`);
  }

  // EXECUTION-based coverage (the barrel-problem fix): each barrel-importer of a broad
  // core seam (~220 `@czap/core` importers) is probed with a scoped v8 coverage run
  // and kept for the seam's function-body lines ONLY when it actually executes a
  // function of the seam — pruning the barrel set to the handful that exercise it, so
  // the broad seams (hlc / dag / content-address) become tractable. The probe results
  // are cached against the toolchain digest (the B2 pattern), so a probe re-runs only
  // when the toolchain, the seam, or the test changes. The probe cache mode rides the
  // SAME toolchain digest the mutant-verdict cache uses (mtMode-namespaced), so a
  // probe minted under one toolchain never serves another.
  const probeCacheOptions: SeamExecutionCoverageOptions = {
    repoRoot,
    cache: makeFsSeamCoverageProbeCache(repoRoot),
    ...(toolchainDigest !== undefined ? { toolchainDigest } : {}),
  };
  const { coverage } = buildSeamCoverageMap(repoRoot, targets, { _tag: 'execution', options: probeCacheOptions });
  const scoreBaseline = readMutationScoreBaseline(repoRoot);
  const equivalents = readEquivalentMutantRegistry(repoRoot);
  const mutantCache = makeFsMutantVerdictCache(repoRoot);

  const outcomes: MutationFacts['outcomes'][number][] = [];
  for (const target of targets) {
    // One runner per seam file — it backs up / mutates / restores exactly that file.
    const runner = makeVitestMutationRunner(repoRoot, { targetFile: target.file });
    const fileFacts = buildMutationFacts([target], {
      runner,
      coverage,
      scoreBaseline,
      equivalents,
      budget: MUTATION_BUDGET_PER_FILE,
      cache: mutantCache,
      ...(toolchainDigest !== undefined ? { toolchainDigest } : {}),
    });
    for (const o of fileFacts.outcomes) outcomes.push(o);
  }
  // Re-sort the merged outcomes deterministically (same total order buildMutationFacts
  // uses) so the facts are byte-stable regardless of the per-file iteration.
  const sorted = [...outcomes].sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      a.line - b.line ||
      a.column - b.column ||
      a.operator.localeCompare(b.operator) ||
      a.mutatedText.localeCompare(b.mutatedText),
  );
  return { outcomes: sorted, scoreBaseline };
}

/**
 * Build the {@link McdcFacts} the avionics `mcdcCoverageGate` folds — the HOST's heavy
 * job (DO-178B Level A MC/DC via CONDITION-LEVEL MUTATION). It mirrors
 * {@link buildRepoMutationFacts} EXACTLY (the cannon-aiming + the SOUND coverage map are
 * shared), differing only in WHAT is mutated: instead of operator-mutants it mints, per
 * atomic CONDITION of each L4 decision, the force-true/force-false pin, evaluates each via
 * the per-pin vitest runner, and folds the two pins per condition into one outcome:
 *   1. The LIVE effective-L4 seam targets from the IR's propagation fixpoint
 *      ({@link l4SeamTargets} — the level is computed from the live IR, never hardcoded).
 *   2. The SOUND covering-tests map ({@link buildSeamCoverageMap}, the same execution-
 *      filtered deep-import ∪ barrel closure the mutation run uses — under-mapping yields
 *      false MC/DC gaps, so it errs toward running too many tests).
 *   3. Per seam, {@link buildMcdcFacts} generates the deterministic condition-mutants,
 *      evaluates each pin via the per-mutant vitest runner (in-place pin → isolated
 *      subprocess → VERIFIED restore — the SAME runner the mutation path uses), and folds
 *      the two pins per condition. The mutant-verdict cache is namespaced by the MC/DC
 *      mode (the toolchain digest carries `mcMode`, see resolveVerdictCache).
 * The runner is constructed per-target-file (each instance pins exactly its file). Pure +
 * deterministic over the seam bytes + the runner verdicts.
 */
function buildRepoMcdcFacts(repoRoot: string, ir: RepoIR, toolchainDigest: string | undefined): McdcFacts {
  const { targets, skippedNotL4, unreadable } = l4SeamTargets(ir, repoRoot);
  // Surface a vanished/demoted seam LOUDLY (stderr), never a quiet hole in the coverage.
  for (const f of skippedNotL4) {
    process.stderr.write(`czap check --mcdc: seam candidate "${f}" is no longer effective-L4 (skipped)\n`);
  }
  for (const f of unreadable) {
    process.stderr.write(`czap check --mcdc: seam candidate "${f}" could not be read (skipped)\n`);
  }

  // The SAME execution-filtered coverage map the mutation run uses (the barrel-problem
  // fix) — a pin's covering set is the deep-importers ∪ the executing barrel-importers.
  const probeCacheOptions: SeamExecutionCoverageOptions = {
    repoRoot,
    cache: makeFsSeamCoverageProbeCache(repoRoot),
    ...(toolchainDigest !== undefined ? { toolchainDigest } : {}),
  };
  const { coverage } = buildSeamCoverageMap(repoRoot, targets, { _tag: 'execution', options: probeCacheOptions });
  const mutantCache = makeFsMutantVerdictCache(repoRoot);

  const conditions: McdcFacts['conditions'][number][] = [];
  for (const target of targets) {
    // One runner per seam file — it backs up / pins / restores exactly that file.
    const runner = makeVitestMutationRunner(repoRoot, { targetFile: target.file });
    const fileFacts = buildMcdcFacts([target], {
      runner,
      coverage,
      cache: mutantCache,
      ...(toolchainDigest !== undefined ? { toolchainDigest } : {}),
    });
    for (const c of fileFacts.conditions) conditions.push(c);
  }
  // Re-sort the merged conditions deterministically (the same total order buildMcdcFacts
  // uses) so the facts are byte-stable regardless of the per-file iteration.
  const sorted = [...conditions].sort(
    (a, b) =>
      a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column || a.condition.localeCompare(b.condition),
  );
  return { conditions: sorted };
}

/**
 * Read the committed per-file mutation-score baseline (the ratchet floor) from
 * {@link MUTATION_SCORE_BASELINE}. Absent file → an empty baseline (the first run
 * has no floor — survivors are surfaced, no ratchet regression). A malformed or
 * non-numeric entry is a tagged throw (a corrupt ratchet artifact must be visible,
 * never silently treated as "no floor").
 */
function readMutationScoreBaseline(repoRoot: string): Readonly<Record<string, number>> {
  const path = join(repoRoot, MUTATION_SCORE_BASELINE);
  if (!existsSync(path)) return {};
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw InvariantViolationError(
      'repo-ir-gauntlet',
      `the mutation-score baseline "${MUTATION_SCORE_BASELINE}" is not a JSON object of file→score — refusing to run with a corrupt ratchet artifact`,
    );
  }
  const baseline: Record<string, number> = {};
  for (const [file, score] of Object.entries(parsed)) {
    if (typeof score !== 'number' || !Number.isFinite(score)) {
      throw InvariantViolationError(
        'repo-ir-gauntlet',
        `the mutation-score baseline entry for "${file}" is not a finite number (got ${String(score)}) — a corrupt ratchet artifact`,
      );
    }
    baseline[file] = score;
  }
  return baseline;
}

/**
 * Read the committed equivalent-mutant registry (the justified non-gaps) from
 * {@link MUTATION_EQUIVALENTS}. Absent file → an EMPTY registry (no mutant treated as
 * equivalent — every mutant runs the normal kill/survive path). A malformed document
 * is a tagged throw (a corrupt registry must be visible, never silently treated as
 * "no equivalents"). The registry matches on the mutant's content address (the
 * anti-drift keystone — a code change re-surfaces the mutant), so it can never silently
 * suppress a real survivor.
 */
function readEquivalentMutantRegistry(repoRoot: string): EquivalentMutantRegistry {
  const path = join(repoRoot, MUTATION_EQUIVALENTS);
  if (!existsSync(path)) return makeEquivalentMutantRegistry([]);
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  return makeEquivalentMutantRegistry(parseEquivalentMutants(parsed));
}

/** Project a discovered workspace package into the analyzer's view. */
function toAnalyzerPkg(p: WorkspacePackageIdentity): WorkspacePkg {
  return { name: p.name, version: p.version, private: p.private, importerPath: p.importerPath };
}

/**
 * Compute the {@link SupplyChainFacts} the avionics `supplyChainGate` folds — the
 * HOST's heavy job (ADR-0012): read pnpm-lock.yaml + the workspace manifests, then
 * run the @czap/cli analyzer (lockfile policy + SBOM completeness + CI authority
 * scan). The lockfile bytes are read once and passed as the live address-of source.
 *
 * NO ShipCapsule is located here: the PROVENANCE family validates a release
 * artifact against the live tree, and a working-tree `czap check` run has no minted
 * capsule. Provenance is therefore left unevidenced — the gate surfaces that as an
 * HONEST advisory (`provenance/not-evidenced`), never a silent green (the gate's
 * own under-coverage contract). The other three families (lockfile / SBOM / CI)
 * ARE evidenced from the live tree and folded into real findings.
 */
function analyzeRepoSupplyChain(repoRoot: string): SupplyChainFacts {
  const lockfilePath = join(repoRoot, 'pnpm-lock.yaml');
  if (!existsSync(lockfilePath)) {
    throw InvariantViolationError(
      'repo-ir-gauntlet',
      `pnpm-lock.yaml not found at ${lockfilePath} — the --supply-chain run cannot compute the avionics-tier facts without the lockfile (the hermetic-build anchor).`,
    );
  }
  const lockfileBytes = readFileSync(lockfilePath);
  const lockfileText = lockfileBytes.toString('utf8');
  const workspace = readWorkspacePackages(repoRoot).map(toAnalyzerPkg);
  const { facts } = analyzeSupplyChain({
    repoRoot,
    lockfileText,
    liveLockfileBytes: new Uint8Array(lockfileBytes.buffer, lockfileBytes.byteOffset, lockfileBytes.byteLength),
    workspace,
  });
  return facts;
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
  /**
   * Compose the avionics-tier `supplyChainGate` (L4) onto the run and inject the
   * host-computed {@link SupplyChainFacts} (`czap check --ir --supply-chain`). It
   * changes BOTH which gates run AND the injected facts, so the verdict cache is
   * NAMESPACED by this mode (see {@link resolveVerdictCache}): a supply-chain
   * verdict can never be served to a non-supply-chain run, or vice versa — exactly
   * the `--symbols` cache-soundness lesson.
   */
  readonly withSupplyChain?: boolean;
  /**
   * Compose the avionics-tier `mutationDivergenceGate` (L4) onto the run and inject
   * the host-computed {@link MutationFacts} (`czap check --ir --mutate`). The host
   * generates the deterministic mutants over the live effective-L4 seams, runs the
   * per-mutant vitest runner, and folds the verdicts. It changes BOTH which gates run
   * AND the injected facts, so the verdict cache is NAMESPACED by this mode (see
   * {@link resolveVerdictCache}): a mutation-run verdict can never be served to a
   * non-mutation run, or vice versa — exactly the `--symbols` / `--supply-chain`
   * cache-soundness lesson. HEAVY (a covering-test suite run per mutant) — opt-in.
   */
  readonly withMutate?: boolean;
  /**
   * Compose the avionics-tier `mcdcCoverageGate` (L4) onto the run and inject the
   * host-computed {@link McdcFacts} (`czap check --ir --mcdc`). The host decomposes each
   * effective-L4 decision into its atomic conditions, mints the force-true/force-false
   * pin per condition, runs each pin via the per-mutant vitest runner, and folds the two
   * pins per condition (a condition is MC/DC-covered iff BOTH pins are killed). It changes
   * BOTH which gates run AND the injected facts, so the verdict cache is NAMESPACED by
   * this mode (see {@link resolveVerdictCache}): an MC/DC verdict can never be served to a
   * non-MC/DC run, or vice versa — exactly the `--mutate` cache-soundness lesson. HEAVY (a
   * covering-test suite run per pin, TWO pins per condition) — opt-in.
   */
  readonly withMcdc?: boolean;
  /**
   * Compose the avionics-tier `simulationDeterminismGate` (L4 — the determinism
   * spine) onto the run and inject the host-computed {@link SimulationFacts}
   * (`czap check --ir --simulate`). The host drives the committed scenario corpus
   * (real L4 trust-spine SUTs) through the `@czap/core/simulation` seeded world,
   * replaying each seed twice and folding the byte-exact-replay verdicts. It changes
   * BOTH which gates run AND the injected facts, so the verdict cache is NAMESPACED
   * by this mode (see {@link resolveVerdictCache}): a simulation-run verdict can never
   * be served to a non-simulation run, or vice versa — exactly the `--symbols` /
   * `--supply-chain` / `--mutate` cache-soundness lesson. The corpus SUTs are pure,
   * so this is light (no subprocess) — opt-in so the default `--ir` run carries no
   * `not-evidenced` advisory.
   */
  readonly withSimulate?: boolean;
  /**
   * Compose the `taintFlowGate` (the TAINT-ANALYSIS family, L4) onto the run and
   * inject the host-computed {@link TaintFacts} (`czap check --ir --taint`). The host
   * traces the source→sink dataflow via @czap/audit's GENERIC taint oracle, classified
   * by the LiteShip-LOCAL `LITESHIP_TAINT_REGISTRY` injected from the CLI host (the
   * ADR-0012 / D7b boundary). It changes BOTH which gates run AND the injected facts,
   * so the verdict cache is NAMESPACED by this mode (see {@link resolveVerdictCache}):
   * a taint-run verdict can never be served to a non-taint run, or vice versa — exactly
   * the `--symbols` / `--supply-chain` / `--mutate` / `--simulate` cache-soundness
   * lesson. HEAVY (a whole-corpus ts.Program + type-checker dataflow trace) — opt-in,
   * so the default `--ir` run carries no taint cost.
   */
  readonly withTaint?: boolean;
  /**
   * Compose the `capabilityGateLinkGate` (codex round-8, #1b — the capability-link dataflow proof, L4)
   * onto the run and inject the host-computed {@link CapabilityLinkFacts} (`czap check --ir
   * --capability-gate`). The host resolves each sanctioned skip's guard against the canonical
   * capability symbol table (the LiteShip-LOCAL module SET + ids injected — the audit oracle names no
   * capability) and proves it DERIVES FROM its declared capability's probe; an unrelated/mislabeled
   * guard is a finding. It changes BOTH which gates run AND the injected facts, so the verdict cache is
   * NAMESPACED by this mode (see {@link resolveVerdictCache}). HEAVY (a ts.Program over the sanctioned
   * files + capability modules) — opt-in.
   */
  readonly withCapabilityGate?: boolean;
  /**
   * Compose the `proofPropagationGate` (the LOCAL-VS-GLOBAL correctness family — the
   * lax-functor, L4) onto the run and inject the host-computed {@link ProofFacts}
   * (`czap check --ir --proof`). The host reads the proof signals (mutation score /
   * coverage / property tests / enrolled invariants) and blends them into a per-module
   * scalar; the gate propagates it along the dep DAG (the `min`-fixpoint) and reports
   * each trust-spine module whose global proof drops below its floor via a weak
   * dependency. It changes BOTH which gates run AND the injected facts, so the verdict
   * cache is NAMESPACED by this mode (see {@link resolveVerdictCache}) — exactly the
   * `--mutate` cache-soundness lesson. LIGHT (artifact reads + a corpus scan, no test
   * runs) — opt-in so the default `--ir` run carries no `not-evidenced` advisory.
   */
  readonly withProof?: boolean;
  /**
   * Compose the `compositionCoverageGate` (the LOCAL-VS-GLOBAL correctness family —
   * "locally green, globally untested interaction", L4) onto the run and inject the
   * host-computed {@link CompositionFacts} (`czap check --ir --composition`). The host
   * derives the interaction edges from the IR call graph (both endpoints individually
   * tested) and classifies each integration-covered/uncovered (the sound
   * static-reference proxy); the gate reports each uncovered edge at its propagated
   * level. It changes BOTH which gates run AND the injected facts, so the verdict cache
   * is NAMESPACED by this mode (see {@link resolveVerdictCache}). LIGHT (a corpus scan
   * over the IR edges, no test runs) — opt-in.
   */
  readonly withComposition?: boolean;
  /**
   * The always-on raccoon-rule backstop ({@link standardsIntegrityGate}) diffs the LIVE
   * standards surface against a PRIOR, INDEPENDENT baseline — the standards snapshot AS
   * COMMITTED ON THE BASE REF the change is reviewed against (read from git), NOT the
   * just-committed working-tree snapshot (so a same-commit code+snapshot weakening still
   * diffs as a weakening). These seams ({@link StandardsFactsOptions}) override the base
   * ref resolution (default: `CZAP_STANDARDS_BASE_REF` → `GITHUB_BASE_REF` → `main`) and
   * the `git show` reader — injected by CI (which knows the PR base) and by hermetic
   * tests (which inject a deterministic base snapshot). FAIL-CLOSED: an unresolvable base
   * THROWS rather than fall back to the working snapshot.
   */
  readonly standards?: StandardsFactsOptions;
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
    // The supply-chain MODE changes BOTH the gate set (supplyChainGate composed on)
    // AND the injected facts WITHOUT changing any file's content digest, so it must
    // namespace the key — else a supply-chain verdict could be served to a
    // non-supply-chain run (the same stale-serve LIE the --symbols namespacing fixes).
    ...(opts.withSupplyChain === true ? { scMode: 'supply-chain' } : {}),
    // The mutation MODE changes BOTH the gate set (mutationDivergenceGate composed
    // on) AND the injected facts WITHOUT changing any file's content digest, so it
    // must namespace the key — else a mutation-run verdict could be served to a
    // non-mutation run (the same stale-serve LIE the --symbols namespacing fixes).
    // This `mtMode` also flows into the mutant-verdict cache key via the toolchain
    // digest, so a mutant verdict minted under one mode never serves another.
    ...(opts.withMutate === true ? { mtMode: 'mutate' } : {}),
    // The MC/DC MODE changes BOTH the gate set (mcdcCoverageGate composed on) AND the
    // injected facts WITHOUT changing any file's content digest, so it must namespace the
    // key — else an MC/DC verdict could be served to a non-MC/DC run (the same stale-serve
    // LIE the --symbols namespacing fixes). This `mcMode` also flows into the mutant-
    // verdict cache key via the toolchain digest, so a condition-pin verdict minted under
    // the MC/DC mode never serves the (operator-) mutation mode or vice versa (the two
    // share the fs mutant cache; the mode disjoins their keys).
    ...(opts.withMcdc === true ? { mcMode: 'mcdc' } : {}),
    // The simulation MODE changes BOTH the gate set (simulationDeterminismGate
    // composed on) AND the injected facts WITHOUT changing any file's content digest,
    // so it must namespace the key — else a simulation-run verdict could be served to
    // a non-simulation run (the same stale-serve LIE the --symbols namespacing fixes).
    ...(opts.withSimulate === true ? { simMode: 'simulate' } : {}),
    // The taint MODE changes BOTH the gate set (taintFlowGate composed on) AND the
    // injected facts WITHOUT changing any file's content digest, so it must namespace
    // the key — else a taint-run verdict could be served to a non-taint run (the same
    // stale-serve LIE the --symbols namespacing fixes).
    ...(opts.withTaint === true ? { taintMode: 'taint' } : {}),
    // The capability-gate MODE changes BOTH the gate set (capabilityGateLinkGate composed
    // on) AND the injected facts WITHOUT changing any file's content digest, so it must
    // namespace the key — else a capability-gate verdict could be served to a
    // non-capability-gate run (the same stale-serve LIE the --symbols namespacing fixes).
    ...(opts.withCapabilityGate === true ? { capabilityGateMode: 'capability-gate' } : {}),
    // The proof MODE changes BOTH the gate set (proofPropagationGate composed on) AND
    // the injected facts WITHOUT changing any file's content digest, so it must
    // namespace the key — else a proof-run verdict could be served to a non-proof run
    // (the same stale-serve LIE the --symbols namespacing fixes).
    ...(opts.withProof === true ? { proofMode: 'proof' } : {}),
    // The composition MODE changes BOTH the gate set (compositionCoverageGate composed
    // on) AND the injected facts WITHOUT changing any file's content digest, so it must
    // namespace the key — else a composition-run verdict could be served to a
    // non-composition run (the same stale-serve LIE the --symbols namespacing fixes).
    ...(opts.withComposition === true ? { compositionMode: 'composition' } : {}),
  };
  return {
    cache: makeFsVerdictCache(opts.cacheCwd ?? repoRoot),
    // The anti-lie keystone: a gate-logic edit rebuilds the gauntlet dist → a new
    // toolchain digest → every cached verdict invalidated. Computed once per run.
    toolchainDigest: gauntletToolchainDigest(env),
    env,
  };
}
