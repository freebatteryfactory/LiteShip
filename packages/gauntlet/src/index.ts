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
} from './gate.js';

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

// The IR-host gate set the CLI runs WHEN an IR is present (the lean set + the
// IR-fold gates). See `LITESHIP_IR_GATES`.
export { type LitelaunchCacheOptions, LITESHIP_IR_GATES, litelaunchGauntletWithIR } from './runner.js';
