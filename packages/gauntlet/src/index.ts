/**
 * `@liteship/gauntlet` — the self-proving, extendable rigor engine.
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
  requireTransition,
  requireSpineRelation,
  requireMcdc,
  requireTaint,
  requireCapabilityLink,
  // The FactGate variant (the "gate-as-data" PoC): a gate whose decision is DATA over a
  // declared, host-produced FactPack — it cannot read undeclared evidence, and its cache
  // identity derives from the declared channels, not a hand-authored evidenceDigest.
  type FactKind,
  FACT_KINDS,
  type FactBundle,
  type FactGate,
  type FactGateSpec,
  defineFactGate,
  isFactGate,
  pickFacts,
  factBundleDigest,
} from './gate.js';

// The SkipSite FactPack + its producer + the bounded per-site decision kernel — the data
// spine the FactGate decides over. The producer (host-side) wraps the canonical skip
// detector + sanction primitives; the kernel is regex/Map/IO-free.
export {
  type SkipSiteFact,
  type SkipSiteFacts,
  type SkipDetector,
  type SkipVerdict,
  isGoverned,
  governedFiles,
  produceSkipSiteFacts,
  produceSkipSiteFactsFromContext,
  decideSkipSite,
} from './facts/skip-site-facts.js';

// The FactGate form of the always-blocking no-skipped-test rule (same ruleId, same findings
// as the closure noSkippedTestGate) — proven equivalent over the adversarial corpus by the
// shadow-diff before any promotion to the production gate set.
export { noSkippedTestFactGate, decideSkips } from './gates/no-skipped-test-fact.js';

export { type MutationFacts, type MutantOutcome, type MutantVerdictTag } from './facts/mutation-facts.js';

// The BISIMULATION fact family (Wave 5.5, the transition cage) — the DYNAMIC-SUBJECT
// half of the conformance backbone. Flat, no-heavy-dep facts (parallel to MutationFacts):
// each case's model/impl observation digests + a status verdict (equivalent|divergent|
// unevidenced). The heavy capture (unfolding op histories over both transports) lives in
// @liteship/audit's buildTransitionFacts + the Foundation harnesses; the lean gate folds.
export { type TransitionFacts, type TransitionCase, type TransitionStatus } from './facts/transition-facts.js';
// The Wave-8.5 two-axis spine-relation facts + pure classifiers. INTERFACE + logic
// only (no `typescript` dep); @liteship/audit's buildSpineRelationFacts probes them, the
// lean gate folds them.
export {
  type SpineRelationFacts,
  type SpineRelationObservation,
  type SpineAuthority,
  type SurfaceRelation,
  classifyStructuralRelation,
  relationSatisfied,
} from './facts/spine-relation-facts.js';

// The LOCAL-VS-GLOBAL correctness family — proof-strength facts + the lax-functor
// `min`-fold over the dep DAG (the dual of assurance propagation), and the
// composition-coverage facts (untested interaction edges).
export { type ProofFacts, type ModuleProof, type ProofSignals, UNMEASURED_PROOF } from './facts/proof-facts.js';
export { propagateProofStrength, weakestLinkPath } from './proof-propagation.js';
export {
  type CompositionFacts,
  type InteractionEdge,
  type CoverageEvidence,
  COVERAGE_EVIDENCE_STRENGTH,
} from './facts/composition-facts.js';

export { type McdcFacts, type McdcConditionOutcome, type McdcPinVerdict, isMcdcCovered } from './facts/mcdc-facts.js';

export {
  type SupplyChainFacts,
  type SupplyChainViolation,
  type LockfilePolicyFacts,
  type SbomFacts,
  type ProvenanceFacts,
  type CiAuthorityFacts,
} from './facts/supply-chain-facts.js';

export { type SimulationFacts, type ScenarioReplayFact, type ReplayDivergence } from './facts/simulation-facts.js';

export {
  type FuzzCorpusFacts,
  type DecoderFuzzFact,
  type DecodeViolation,
  type DecodeViolationClass,
} from './facts/fuzz-facts.js';

export {
  type TaintFacts,
  type TaintFlow,
  type TaintEndpoint,
  type SanitizerSite,
  type TaintPathStep,
} from './facts/taint-facts.js';

export { type CapabilityLinkFacts, type CapabilityLinkResult } from './facts/capability-link-facts.js';

export {
  type TraceabilityFacts,
  type ResolvedInvariant,
  type InvariantState,
  type InvariantProven,
  type InvariantUntraced,
  type InvariantWaived,
  type InvariantExpired,
  type TraceabilityDivergence,
} from './facts/traceability-facts.js';

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
  NO_EVIDENCE_MARKER,
  gateVerdictKey,
  coverageDigestOf,
  allFileIds,
  stableEvidenceDigest,
  stableSerialize,
  factAccessEvidenceDigest,
  ACCESSED_ABSENT_MARKER,
} from './verdict-cache.js';

// The structural enforcement of the evidence-declaration LAW: the instrumented
// GateContext recorder the meta-test drives to prove no gate reads undeclared
// out-of-IR / fact-channel evidence (the verdict-cache soundness drill sergeant).
export {
  type EvidenceChannel,
  type FactChannel,
  type AbsentRead,
  type EvidenceRecorder,
  FACT_CHANNELS,
  ABSENT_SUFFIX,
  recordingContext,
} from './evidence-recorder.js';

export { type LevelRule, LITESHIP_ASSURANCE_MAP, levelOf, matchesGlob } from './assurance-map.js';

export { propagateAssuranceLevels } from './assurance-propagation.js';

export { type Waiver, type WaiverApplication, ALWAYS_BLOCKING_RULES, applyWaivers } from './waiver.js';

export { LITESHIP_WAIVERS } from './waivers.js';

// The AGENT-SAFETY META-GAUNTLET (the "raccoon rule") — the lean standards-surface
// model + the PURE weakening-diff + the owner-sign-off application. The HOST extractor
// (`packages/cli/src/lib/standards-surface.ts`) reads the live surface, content-
// addresses it, diffs it vs the committed snapshot, and folds the decided verdicts into
// the StandardsIntegrityFacts the `standardsIntegrityGate` reports.
export {
  type GateSurface,
  type WaiverSurface,
  type AlwaysBlockingSurface,
  type AssuranceSurface,
  type InvariantSurface,
  type FloorSurface,
  type FloorDirection,
  type StandardsElement,
  type StandardsSurface,
  type StandardsWaiver,
  type ChangeClass,
  type WeakeningClass,
  type StandardsChange,
  type StandardsIntegrityFacts,
  NEVER_SIGNABLE_WEAKENINGS,
  surfaceElementKey,
  sortSurfaceElements,
  diffStandardsSurface,
  applyStandardsWaivers,
  type SiteConditionalityResolver,
} from './facts/standards-facts.js';

// The AGENT-SAFETY META-GAUNTLET (the "raccoon rule") phases B+C — the DECLARED-FIX
// PROTOCOL: the lean DeclaredFix record (intent + scope + size-cap + before/after
// receipts) + the PURE `verifyDeclaredFix` admission verifier (scope ⊆ declared, size
// ≤ cap, no unsigned weakening REUSING phase A, receipt-consistency). The SAME verifier
// runs at the runtime apply moment (phase B) and as the commit gate (phase C) — one
// engine. The HOST measures the actual change + mints the receipts via `@liteship/core`'s
// `contentAddressOf`, then folds the verdict into the DeclaredFixFacts the
// `declaredFixProtocolGate` reports.
export {
  type FixReceipt,
  type DeclaredFix,
  type FixScope,
  type FixSizeCap,
  type ActualChange,
  type FixRejectionClass,
  type FixRejection,
  type FixVerdict,
  type MeasuredFixReality,
  type DeclaredFixFacts,
  fileMatchesGlob,
  verifyDeclaredFix,
} from './declared-fix.js';

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
export { noEarlyReturnTestGate } from './gates/no-early-return-test.js';
export { detectEarlyReturnBeforeExpect, type EarlyReturnMatch } from './gates/early-return-detect.js';

// The skip-form detector + the enumerated sanctioned-skip allowlist — exported so the
// standards-surface extractor can fold the allowlist into the content-addressed snapshot
// (a sanctioned skip is a visible, snapshot-pinned standards element; adding one is a
// WEAKEN the raccoon-rule diff surfaces) and a host/test can reuse the ONE detector.
export { type SkipForm, type SkipMatch, type SkipConditionality, detectSkips } from './gates/skip-detect.js';
export {
  type SkipCapability,
  type SanctionedSkip,
  SKIP_CAPABILITIES,
  SANCTIONED_SKIPS,
  asSkipCapability,
  sanctionedSkipFor,
  fileHasSanctionedSkip,
  normalizeSiteLine,
  // The placeholder-marker floor: a skip whose SITE carries a TODO/FIXME/not-implemented/…
  // marker is NON-sanctionable + NON-signable — a placeholder can never be signed away,
  // even via the owner-signable capability-gate category (the standards weakening partition
  // rejects it too). Exported so the host/tests can reuse the ONE detector + vocabulary.
  PLACEHOLDER_SKIP_MARKERS,
  siteCarriesPlaceholderMarker,
  // The capability-CONSISTENCY floor (codex round-6): a sanctioned skip must be self-consistent
  // with its declared capability — a visible conditional form OR a title referencing the
  // capability domain. An unconditional `it.skip("later")` (marker-free placeholder) is NOT —
  // it stays blocking + a covering sign-off is void. The SOUND conditionality proof is the AST
  // follow-up. Exported so the host/tests reuse the ONE consistency check.
  siteConsistentWithCapability,
} from './gates/skip-allowlist.js';

// The IR-fold gates (Slice B, B1) — these REQUIRE the injected repo-IR, so they
// run only on the host path (the CLI builds + injects the IR). They are NOT in
// the lean LITESHIP_GATES default; the IR-injected CLI run composes them on.
export { noBareThrowIRGate } from './gates/no-bare-throw-ir.js';
export { type OracleDivergenceSpec, makeOracleDivergenceGate } from './gates/make-oracle-divergence-gate.js';
export { noDefaultExportDivergenceGate } from './gates/no-default-export-divergence.js';
export { noVarDivergenceGate } from './gates/no-var-divergence.js';
export { noRequireDivergenceGate } from './gates/no-require-divergence.js';
export { symbolOrphanDivergenceGate } from './gates/symbol-orphan-divergence.js';
export { activeModeledSurfaceReaderGate, decideActiveSurfaceReaders } from './gates/active-modeled-surface-reader.js';
export {
  type ActiveSurfaceFacts,
  type ActiveSurfaceEntry,
  type ActiveSurfacePromotion,
} from './facts/active-surface-facts.js';

// The three check-governance META-GATES + their decision kernels + the FactPack shape.
// FactGates over the injected CheckGovernanceFacts (a host folds @liteship/command's
// CHECK_REGISTRY / SCRIPT_EXEMPTIONS / package.json / fs / LITESHIP_WAIVERS / the ledger);
// they ride in LITESHIP_GATES and fold empty when the facts are absent (lean production).
export { checkRegistryCompleteGate, decideCheckRegistryComplete } from './gates/check-registry-complete.js';
export { checkNegativeControlGate, decideCheckNegativeControl } from './gates/check-negative-control.js';
export { checkWaiverFreshnessGate, decideCheckWaiverFreshness } from './gates/check-waiver-freshness.js';
export {
  type CheckGovernanceFacts,
  type CheckPartitionFacts,
  type RegisteredCheckFact,
  type NegativeControlFact,
  type WaiverFreshnessFact,
} from './facts/check-governance-facts.js';
export { crdtLawsGate } from './gates/crdt-laws.js';

// The avionics-tier (Slice C) performance-contracts gate — a LEAN, deterministic
// fold over the committed `benchmarks/` artifacts (declared-distribution registry +
// complexity-class map). It does NOT requireIR, but it ships in LITESHIP_IR_GATES
// (the IR-host composition), not the lean cut LITESHIP_GATES.
export { performanceContractsGate } from './gates/performance-contracts.js';

// The claim-vs-reality perf-claim gate (Slice C) — scans published `packages/*/src`
// for MEASURABLE performance claims (`zero-alloc` / `fast-path` / `O(1)` …) in symbol
// names or doc-comments that NO bench measures. A pure fold over GateContext bytes
// (no IR), it ships in LITESHIP_IR_GATES alongside the other claim-vs-reality gates,
// not the lean cut LITESHIP_GATES. This is the gate that would have caught a
// "zero-allocation hot path" claim shipped without an allocation bench.
export { perfClaimBenchGate, PERF_CLAIM_BENCH_RULE_ID } from './gates/perf-claim-bench.js';

// The claim-vs-reality SEMANTIC-claim gate (Slice C — the family beyond perf). It
// scans published `packages/*/src` for a SEMANTIC PROPERTY claim (`deterministic` /
// `pure` / `content-addressed` / `canonical`) in a symbol name or doc-comment that NO
// MEASURABLE confirmer backs: a determinism/DST/property test for the claimed symbol
// (deterministic), an in-file ambient-entropy check (pure — a `pure` fn co-located
// with a `Date.now()`/`Math.random()` read is the strongest contradiction), or a
// round-trip identity test through the content-address kernel (content-addressed /
// canonical). A pure byte-fold over GateContext (no IR), it ships red/green/mutation
// fixtures and rides in LITESHIP_IR_GATES alongside the perf-claim gate, never the
// lean cut LITESHIP_GATES. The Rice boundary: only MEASURABLE confirmers are HARD here
// — the undecidable "does it ACTUALLY compute a canonical form?" is the ambition÷proof
// HEATMAP's advisory triage, never a blocking verdict.
export { claimPropertyGate, CLAIM_PROPERTY_RULE_ID } from './gates/claim-property.js';

// The AMBITION÷PROOF HEATMAP (the claim-vs-reality family's ADVISORY half) — a PURE,
// deterministic fold (committed benchmark/coverage data + the injected RepoIR) ranking
// each substantive `packages/*/src` module by AMBITION (size + complexity + claim-
// keyword density + effective assurance) ÷ PROOF (has-a-test + property-test + mutation
// score + bench + enrolled invariant + non-test call-sites). Pure TRIAGE: it is NEVER a
// gate, has NO authority, NEVER blocks — it surfaces the high-ambition/low-proof hot
// spots a human investigates. The heavy IR build is host-side (ADR-0012); this module
// is the pure fold the host calls with already-loaded data. See {@link computeHeatmap}.
export {
  type HeatmapInputs,
  type ModuleAmbition,
  type ModuleProofSignals,
  type ModuleHotSpot,
  type AmbitionProofHeatmap,
  HEATMAP_FORMAT,
  computeHeatmap,
} from './ambition-proof.js';

// The avionics-tier supply-chain gate (Slice C). It folds the host-supplied
// SupplyChainFacts (lockfile policy / SBOM / provenance / CI authority) — the
// heavy analysis lives in the @liteship/cli host. Exported but DELIBERATELY NOT in
// LITESHIP_GATES / LITESHIP_IR_GATES: it runs on the facts-injected host path
// only. See the integrator note in the Slice-C report (a ~3-line wiring like B3.3).
export { supplyChainGate } from './gates/supply-chain.js';

// The avionics-tier mutation-divergence gate (Slice C — mutation-as-divergence).
// It folds the host-supplied MutationFacts (each mutant's kill/survive verdict +
// the committed score baseline): a SURVIVED/NO-COVERAGE mutant becomes a Finding at
// the file's PROPAGATED assurance level, the kill-floor by level deciding blocking,
// and a per-file score drop is a ratchet regression. The heavy AST mutation + the
// per-mutant vitest runs live in @liteship/audit + the @liteship/cli host. Exported but
// DELIBERATELY NOT in LITESHIP_GATES / LITESHIP_IR_GATES: mutation is OPT-IN
// (`liteship check --ir --mutate`) — running a suite per mutant is too heavy for a
// default run. The integrator composes it on like supplyChainGate (a ~3-line
// wiring). See the SURVIVOR_SEVERITY_BY_LEVEL / KILL_FLOOR_BY_LEVEL redlinable data.
export {
  mutationDivergenceGate,
  SURVIVOR_SEVERITY_BY_LEVEL,
  KILL_FLOOR_BY_LEVEL,
} from './gates/mutation-divergence.js';

// The Wave-5.5 transition-cage TRANSITION-CONFORMANCE gate (the constitution's
// BISIMULATION half). It folds the host-supplied TransitionFacts (each seeded op
// history's model-vs-implementation bisimulation verdict): a DIVERGENT case becomes a
// replayable Finding at the family's assurance level (severity by level deciding
// blocking), an UNEVIDENCED case a coverage gap floored by the committed ratchet. The
// capture (unfolding op histories over the reference model + the native transport) lives in
// @liteship/audit's buildTransitionFacts + the LiteShip-local reactive capture/model runner
// (tests/support/reactive-conformance.ts). Exported but DELIBERATELY NOT in LITESHIP_GATES /
// LITESHIP_IR_GATES: the model + native-transport oracle are LiteShip-specific product
// machinery in the test tree, so — per ADR-0012/0023 — the gate is HOSTED by the repo-local
// `transition:gate` phase (scripts/transition-conformance-gate.ts, run every PR), NOT the
// shipped `liteship check` CLI. See the DIVERGENCE_SEVERITY_BY_LEVEL / TRANSITION_FAMILY_LEVEL
// redlinable data.
export {
  transitionConformanceGate,
  DIVERGENCE_SEVERITY_BY_LEVEL,
  TRANSITION_FAMILY_LEVEL,
} from './gates/transition-conformance.js';
// The Wave-8.5 two-axis spine-relation gate. Exported but DELIBERATELY NOT in
// LITESHIP_GATES / LITESHIP_IR_GATES: it is OPT-IN (`liteship check --ir --spine-relation`)
// — a ts.Program probe over the spine + runtime surface is too heavy for a default
// run. The integrator composes it on like transitionConformanceGate (a ~3-line
// wiring); @liteship/audit's buildSpineRelationFacts builds the injected facts.
export { spineRelationGate } from './gates/spine-relation.js';

// The avionics-tier MC/DC-coverage gate (DO-178B Level A's Modified Condition/Decision
// Coverage, realized as CONDITION-LEVEL MUTATION — a sound, recognized technique reusing
// the mutation engine). It folds the host-supplied McdcFacts (each atomic condition's
// two pins' verdicts folded): a condition whose independent effect is NOT observed (a
// surviving force-true/force-false pin) becomes a Finding at the file's PROPAGATED
// assurance level, the MC/DC floor by level deciding blocking (L4 requires FULL MC/DC).
// The heavy condition-mutant AST work + the per-pin vitest runs live in @liteship/audit + the
// @liteship/cli host. Exported but DELIBERATELY NOT in LITESHIP_GATES / LITESHIP_IR_GATES:
// MC/DC is OPT-IN (`liteship check --ir --mcdc`) — running a suite per pin (two per condition)
// is too heavy for a default run. The integrator composes it on like mutationDivergenceGate
// (a ~3-line wiring). See the MCDC_SEVERITY_BY_LEVEL / MCDC_FLOOR_BY_LEVEL redlinable data.
export { mcdcCoverageGate, MCDC_SEVERITY_BY_LEVEL, MCDC_FLOOR_BY_LEVEL } from './gates/mcdc-coverage.js';

// The avionics-tier simulation-determinism (DST) gate (Slice C). It folds the
// host-supplied SimulationFacts — a replay-divergence (two replays of one seed
// produce different byte-exact trace digests) is a self-explaining L4 Finding
// carrying the seed. The heavy work (minting a seeded world, running the scenario
// corpus, replaying, content-addressing traces) lives in @liteship/core/simulation,
// driven by the @liteship/cli host (`liteship check --ir --simulate`). Exported but
// DELIBERATELY NOT in LITESHIP_GATES / LITESHIP_IR_GATES: it runs on the
// facts-injected, opt-in `--simulate` host path only (a ~3-line wiring like
// supplyChainGate — the integrator composes it on, the gate ships qualified).
export { simulationDeterminismGate } from './gates/simulation-determinism.js';

// The avionics-tier decode-fuzz gate (the untrusted-byte decode-surface hardening).
// It folds the host-supplied FuzzCorpusFacts — a decode-surface violation (a raw
// crash / a prototype-pollution / a misparse on an L4 decoder — canonical-CBOR /
// HLC / GraphPatch / DocumentGraph / ShipCapsule) is a self-explaining L4 Finding
// carrying the REPRODUCER (a corpus seed id or a `generated@seed=0x…` source). The
// heavy work (hammering every decoder with the committed `tests/fixtures/fuzz-corpus`
// seeds + a fixed, seeded count of `fast-check` generated inputs, classifying each
// outcome) lives in the `tests/fuzz` decode fuzzer, driven by the @liteship/cli host.
// Exported but DELIBERATELY NOT in LITESHIP_GATES / LITESHIP_IR_GATES: it runs on the
// facts-injected host path only (a ~3-line wiring like supplyChainGate — the
// integrator composes it on, the gate ships qualified).
export { fuzzCorpusGate } from './gates/fuzz-corpus.js';

// The TAINT-ANALYSIS family gate (the untrusted-input source→sink hardening). It
// folds the host-supplied TaintFacts — an UNSANITIZED source→sink dataflow (an
// untrusted fetch/AI-cast-proposal/runtime-URL/file-env value reaching a dangerous
// shader-compile / innerHTML / graph-apply / fetch sink with NO sanitizer on the
// path) is a self-explaining Finding at the sink's (propagated) level; a sanitized
// flow is the guarded-seam green (no finding). The heavy work (the whole-corpus
// `ts.Program` + type-checker dataflow trace) lives in @liteship/audit's taint oracle,
// classified by the LiteShip-LOCAL source/sink/sanitizer registry the @liteship/cli
// host injects (the audit engine references NO LiteShip policy — ADR-0012/D7b).
// Exported but DELIBERATELY NOT in LITESHIP_GATES / LITESHIP_IR_GATES: taint is
// OPT-IN (`liteship check --ir --taint`) — a whole-corpus trace is too heavy for a
// default run. The integrator composes it on like supplyChainGate (a ~3-line
// wiring).
export { taintFlowGate } from './gates/taint-flow.js';
export { capabilityGateLinkGate } from './gates/capability-gate-link.js';

// The avionics-tier requirements-traceability bridge gate (DO-178B-style). It folds
// the host-supplied TraceabilityFacts — an UNTRACED invariant, an EXPIRED waiver, or
// a ledger⇔header DIVERGENCE becomes a self-explaining Finding at the invariant's
// level. The heavy work (parsing traceability/*.yaml, scanning the corpus for
// `// PROVES:` headers, running the lifecycle state machine against an injected
// wall-clock date, content-addressing the resolved ledger) lives in the @liteship/cli
// host (`packages/cli/src/lib/traceability.ts`). Exported but DELIBERATELY NOT in
// LITESHIP_GATES / LITESHIP_IR_GATES: it runs on the facts-injected host path only.
// The CLI composes it ALWAYS-ON on the `--ir` path (the committed ledger is cheap to
// fold), the same ~3-line wiring as supplyChainGate. See the integrator note.
export { traceabilityBridgeGate } from './gates/traceability-bridge.js';

// The AGENT-SAFETY META-GAUNTLET gate (the "raccoon rule", phase A) — the
// UNCONDITIONAL COMMIT BACKSTOP. It folds the host-supplied StandardsIntegrityFacts (the
// live standards surface diffed against its committed content-addressed snapshot, the
// owner sign-offs already applied): an UNSIGNED weakening is a BLOCKING L4 Finding — the
// gauntlet guarding its OWN rigor standards from silent erosion. Exported but
// DELIBERATELY NOT in LITESHIP_GATES / LITESHIP_IR_GATES: it runs on the facts-injected
// host path only. The CLI composes it ALWAYS-ON on the `--ir` path (the committed
// snapshot diff is cheap to fold), the same ~3-line wiring as traceabilityBridgeGate.
export { standardsIntegrityGate } from './gates/standards-integrity.js';

// The AGENT-SAFETY META-GAUNTLET gate (the "raccoon rule", phases B+C) — the agent-fix
// ADMISSION gate. It folds the host-supplied DeclaredFixFacts (the host already ran
// `verifyDeclaredFix` at the apply moment and/or freshly at commit time): a REJECTED
// fix (scope-creep, size-exceeded, an unsigned/forbidden standards weakening reusing
// phase A, or a forged/missing receipt) is a BLOCKING L4 Finding per reason — the
// raccoon caught on the APPLY path (phase A's `standardsIntegrityGate` guards the raw
// commit path). When NO declared-fix facts are present (a normal commit) the gate is
// SILENT. Exported but DELIBERATELY NOT in LITESHIP_GATES / LITESHIP_IR_GATES: it runs
// on the facts-injected AGENT-FIX admission path only — the integrator composes it on
// ONLY when an agent-fix is being validated (a ~3-line wiring like supplyChainGate:
// push the gate + inject the verified DeclaredFixFacts as context.declaredFix). See the
// integrator note in the Slice-B/C report.
export { declaredFixProtocolGate } from './gates/declared-fix-protocol.js';

// The LOCAL-VS-GLOBAL correctness family — PROOF-PROPAGATION gate (the lax-functor).
// It propagates a per-module proof scalar along the IR's dep DAG (the `min`-fixpoint
// dual of assurance propagation) and folds the host-supplied ProofFacts: a trust-spine
// (L4/L3) module whose EFFECTIVE/global proof drops below its level floor BECAUSE of a
// weak dependency is a self-explaining Finding naming the weak-link path. The heavy work
// (reading the proof signals — mutation score / coverage / property tests / enrolled
// invariants — and blending the per-module scalar) lives in the @liteship/cli host (`liteship
// check --ir --proof`). Exported but DELIBERATELY NOT in LITESHIP_GATES /
// LITESHIP_IR_GATES: it runs on the facts-injected, opt-in `--proof` host path only (a
// ~3-line wiring like supplyChainGate — push the gate + inject ProofFacts). When the
// facts are absent it advisories "not-evidenced" rather than passing silent. See the
// PROOF_FLOOR_BY_LEVEL / PROOF_SEVERITY_BY_LEVEL redlinable data.
export {
  proofPropagationGate,
  PROOF_FLOOR_BY_LEVEL,
  PROOF_SEVERITY_BY_LEVEL,
  UNMEASURED_WEAK_LINK_SEVERITY,
} from './gates/proof-propagation.js';

// The LOCAL-VS-GLOBAL correctness family — COMPOSITION-COVERAGE gate ("locally green,
// globally untested interaction"). It folds the host-supplied CompositionFacts (the
// interaction edges between individually-tested units, each classified covered/uncovered
// by a per-test execution probe or the sound static-reference proxy): an UNCOVERED edge
// (A calls B, both tested, no integration test exercises them together) is a
// self-explaining Finding at the edge's propagated level, honestly stating which
// evidence class decided it (a structural over-approximation of integration coverage).
// The heavy work (deriving the call-graph edges + the individually-tested set + the
// integration-coverage probe) lives in the @liteship/cli host (`liteship check --ir
// --composition`). Exported but DELIBERATELY NOT in LITESHIP_GATES / LITESHIP_IR_GATES:
// it runs on the facts-injected, opt-in `--composition` host path only (a ~3-line wiring
// like supplyChainGate). When the facts are absent it advisories "not-evidenced". See the
// COMPOSITION_SEVERITY_BY_LEVEL redlinable data.
export { compositionCoverageGate, COMPOSITION_SEVERITY_BY_LEVEL } from './gates/composition-coverage.js';

// The IR-host gate set the CLI runs WHEN an IR is present (the lean set + the
// IR-fold gates). See `LITESHIP_IR_GATES`.
export { type LitelaunchCacheOptions, LITESHIP_IR_GATES, litelaunchGauntletWithIR } from './runner.js';
