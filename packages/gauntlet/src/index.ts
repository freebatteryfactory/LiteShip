/**
 * `@czap/gauntlet` — the self-proving, extendable rigor engine.
 *
 * The foundations (Slice A): the {@link Finding} vocabulary humans and agents
 * share, {@link AssuranceLevel} (the hazard model that aims rigor), the
 * {@link Gate} plugin contract (a fitness function `(context) => Finding[]`),
 * and the authority ratchet (a gate earns blocking power by self-proving
 * against its own red/green/mutation fixtures — see {@link verifyGate}).
 *
 * Extend by composing: a downstream project `defineGate`s its own gate with its
 * own fixtures and hands it to {@link runGates} alongside LiteShip's built-ins —
 * no fork, no rebuild. The engine qualifies every gate, theirs and ours, by the
 * same ratchet.
 *
 * Slice B widens {@link GateContext} into the triangulated repo-IR; Slice C adds
 * the mutation/simulation/avionics gate families. The contracts here do not
 * change underneath them.
 *
 * @module
 */

export {
  type AssuranceLevel,
  type AssuranceSpec,
  ASSURANCE_LEVELS,
  ASSURANCE,
  rankOf,
  atLeast,
  maxLevel,
} from './assurance.js';

export {
  type Severity,
  type SourceLocation,
  type Remediation,
  type Finding,
  type FindingInput,
  SEVERITIES,
  finding,
  isFinding,
  fromError,
  isProjectableError,
  tallyBySeverity,
} from './finding.js';

export {
  type FileId,
  type SymbolId,
  type PkgName,
  type CoverageClass,
  type SymbolKind,
  type ImportKind,
  type FileNode,
  type SymbolNode,
  type ImportEdge,
  type PackageNode,
  type RefSite,
  type Fact,
  type RepoIR,
  type RepoIRParts,
  COVERAGE_CLASSES,
  COVERAGE_CLASS_SEVERITY,
  PLACEHOLDER_DIGEST,
  makeRepoIR,
  coverageClassSeverity,
  strongerCoverageClass,
} from './repo-ir.js';

export {
  type GateContext,
  type GateFixture,
  type GateFixtures,
  type GateMutation,
  type Gate,
  defineGate,
  requireIR,
  requireMutation,
} from './gate.js';

export {
  type MutationFacts,
  type MutantOutcome,
  type MutantVerdictTag,
} from './mutation-facts.js';

export {
  type SupplyChainFacts,
  type SupplyChainViolation,
  type LockfilePolicyFacts,
  type SbomFacts,
  type ProvenanceFacts,
  type CiAuthorityFacts,
} from './supply-chain-facts.js';

export {
  type SimulationFacts,
  type ScenarioReplayFact,
  type ReplayDivergence,
} from './simulation-facts.js';

export { type Authority, type GateProof, verifyGate, earnedAuthority } from './authority.js';

export {
  type GateOutcome,
  type GauntletResult,
  type RunGatesOptions,
  runGates,
  scopeContextByLevel,
  memoryContext,
} from './engine.js';

export {
  type GateVerdictCache,
  type GateVerdictKeyParts,
  MISSING_DIGEST_SENTINEL,
  gateVerdictKey,
  coverageDigestOf,
  allFileIds,
} from './verdict-cache.js';

export {
  type LevelRule,
  LITESHIP_ASSURANCE_MAP,
  levelOf,
  matchesGlob,
} from './assurance-map.js';

export { propagateAssuranceLevels } from './assurance-propagation.js';

export {
  type Waiver,
  type WaiverApplication,
  ALWAYS_BLOCKING_RULES,
  applyWaivers,
} from './waiver.js';

export { LITESHIP_WAIVERS } from './waivers.js';

export { nodeContext } from './node-context.js';

export {
  type RunGauntletOnRepoOptions,
  runGauntletOnRepo,
  litelaunchGauntlet,
  LITESHIP_GATES,
  DEFAULT_GAUNTLET_GLOBS,
} from './runner.js';

// The shared comment/string stripper — the honest "is this CODE?" floor. Exported
// so a host script (the bench-contract producer) strips bench source through the
// ONE implementation the gates use, never a copy.
export { codeOnly, stringsBlanked, commentsBlanked } from './gates/code-only.js';

export { noBareThrowGate } from './gates/no-bare-throw.js';
export { noTsIgnoreGate } from './gates/no-ts-ignore.js';
export { noNondeterminismGate } from './gates/no-nondeterminism.js';
export { noSilentCatchGate } from './gates/no-silent-catch.js';
export { noSkippedTestGate } from './gates/no-skipped-test.js';
export { noPlaceholderGate } from './gates/no-placeholder.js';

// The IR-fold gates (Slice B, B1) — these REQUIRE the injected repo-IR, so they
// run only on the host path (the CLI builds + injects the IR). They are NOT in
// the lean LITESHIP_GATES default; the IR-injected CLI run composes them on.
export { noBareThrowIRGate } from './gates/no-bare-throw-ir.js';
export {
  type OracleDivergenceSpec,
  makeOracleDivergenceGate,
} from './gates/make-oracle-divergence-gate.js';
export { noDefaultExportDivergenceGate } from './gates/no-default-export-divergence.js';
export { noVarDivergenceGate } from './gates/no-var-divergence.js';
export { noRequireDivergenceGate } from './gates/no-require-divergence.js';
export { symbolOrphanDivergenceGate } from './gates/symbol-orphan-divergence.js';
export { crdtLawsGate } from './gates/crdt-laws.js';

// The avionics-tier (Slice C) performance-contracts gate — a LEAN, deterministic
// fold over the committed `benchmarks/` artifacts (declared-distribution registry +
// complexity-class map). It does NOT requireIR, but it ships in LITESHIP_IR_GATES
// (the IR-host composition), not the lean cut LITESHIP_GATES.
export { performanceContractsGate } from './gates/performance-contracts.js';

// The avionics-tier supply-chain gate (Slice C). It folds the host-supplied
// SupplyChainFacts (lockfile policy / SBOM / provenance / CI authority) — the
// heavy analysis lives in the @czap/cli host. Exported but DELIBERATELY NOT in
// LITESHIP_GATES / LITESHIP_IR_GATES: it runs on the facts-injected host path
// only. See the integrator note in the Slice-C report (a ~3-line wiring like B3.3).
export { supplyChainGate } from './gates/supply-chain.js';

// The avionics-tier mutation-divergence gate (Slice C — mutation-as-divergence).
// It folds the host-supplied MutationFacts (each mutant's kill/survive verdict +
// the committed score baseline): a SURVIVED/NO-COVERAGE mutant becomes a Finding at
// the file's PROPAGATED assurance level, the kill-floor by level deciding blocking,
// and a per-file score drop is a ratchet regression. The heavy AST mutation + the
// per-mutant vitest runs live in @czap/audit + the @czap/cli host. Exported but
// DELIBERATELY NOT in LITESHIP_GATES / LITESHIP_IR_GATES: mutation is OPT-IN
// (`czap check --ir --mutate`) — running a suite per mutant is too heavy for a
// default run. The integrator composes it on like supplyChainGate (a ~3-line
// wiring). See the SURVIVOR_SEVERITY_BY_LEVEL / KILL_FLOOR_BY_LEVEL redlinable data.
export {
  mutationDivergenceGate,
  SURVIVOR_SEVERITY_BY_LEVEL,
  KILL_FLOOR_BY_LEVEL,
} from './gates/mutation-divergence.js';

// The avionics-tier simulation-determinism (DST) gate (Slice C). It folds the
// host-supplied SimulationFacts — a replay-divergence (two replays of one seed
// produce different byte-exact trace digests) is a self-explaining L4 Finding
// carrying the seed. The heavy work (minting a seeded world, running the scenario
// corpus, replaying, content-addressing traces) lives in @czap/core/simulation,
// driven by the @czap/cli host (`czap check --ir --simulate`). Exported but
// DELIBERATELY NOT in LITESHIP_GATES / LITESHIP_IR_GATES: it runs on the
// facts-injected, opt-in `--simulate` host path only (a ~3-line wiring like
// supplyChainGate — the integrator composes it on, the gate ships qualified).
export { simulationDeterminismGate } from './gates/simulation-determinism.js';

// The IR-host gate set the CLI runs WHEN an IR is present (the lean set + the
// IR-fold gates). See `LITESHIP_IR_GATES`.
export { type LitelaunchCacheOptions, LITESHIP_IR_GATES, litelaunchGauntletWithIR } from './runner.js';
