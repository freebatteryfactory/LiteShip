/**
 * The real-repo runner — the ONE live entrypoint that runs the gauntlet over the
 * actual tree, with the committed assurance map and the committed waivers applied.
 *
 * `runGauntletOnRepo` is the production composition of {@link runGates} +
 * {@link nodeContext}: it globs the repo into a {@link GateContext} and runs the
 * gates through the same authority ratchet the in-memory path uses. The
 * filesystem touch is confined to {@link nodeContext}; this module just composes.
 *
 * Crucially, this is NOT dead convenience sugar — {@link litelaunchGauntlet}
 * binds the real built-in gate set, the committed {@link LITESHIP_ASSURANCE_MAP},
 * and the committed {@link LITESHIP_WAIVERS} into one call. The dogfood tests
 * exercise THIS function over `packages/&#42;/src`, so the waivers in `waivers.ts`
 * actually govern a real run (a waiver that suppresses nothing on the real repo
 * has no teeth; here they do — an active boundary waiver suppresses its finding,
 * an expired one re-reds and blocks).
 *
 * @module
 */

import type { Gate } from './gate.js';
import type { SkipMatch } from './gates/skip-detect.js';
import type { RepoIR } from './repo-ir.js';
import type { SupplyChainFacts } from './supply-chain-facts.js';
import type { MutationFacts } from './mutation-facts.js';
import type { McdcFacts } from './mcdc-facts.js';
import type { SimulationFacts } from './simulation-facts.js';
import type { TaintFacts } from './taint-facts.js';
import type { TraceabilityFacts } from './traceability-facts.js';
import type { StandardsIntegrityFacts } from './standards-facts.js';
import type { FuzzCorpusFacts } from './fuzz-facts.js';
import type { ProofFacts } from './proof-facts.js';
import type { CompositionFacts } from './composition-facts.js';
import { runGates, type GauntletResult, type RunGatesOptions } from './engine.js';
import type { GateVerdictCache } from './verdict-cache.js';
import { nodeContext } from './node-context.js';
import { LITESHIP_ASSURANCE_MAP, levelOf } from './assurance-map.js';
import { propagateAssuranceLevels } from './assurance-propagation.js';
import { LITESHIP_WAIVERS } from './waivers.js';
import { noBareThrowGate } from './gates/no-bare-throw.js';
import { noTsIgnoreGate } from './gates/no-ts-ignore.js';
import { noNondeterminismGate } from './gates/no-nondeterminism.js';
import { noSilentCatchGate } from './gates/no-silent-catch.js';
import { noSkippedTestGate } from './gates/no-skipped-test.js';
import { noPlaceholderGate } from './gates/no-placeholder.js';
import { noBareThrowIRGate } from './gates/no-bare-throw-ir.js';
import { noDefaultExportDivergenceGate } from './gates/no-default-export-divergence.js';
import { noVarDivergenceGate } from './gates/no-var-divergence.js';
import { noRequireDivergenceGate } from './gates/no-require-divergence.js';
import { symbolOrphanDivergenceGate } from './gates/symbol-orphan-divergence.js';
import { crdtLawsGate } from './gates/crdt-laws.js';
import { performanceContractsGate } from './gates/performance-contracts.js';
import { perfClaimBenchGate } from './gates/perf-claim-bench.js';
import { claimPropertyGate } from './gates/claim-property.js';

/**
 * LiteShip's built-in gate set — the gates the repo runs against itself. The two
 * always-blocking gates ({@link noSkippedTestGate} / {@link noPlaceholderGate})
 * are listed alongside the four hygiene gates: their rule ids are exactly the ones
 * {@link ALWAYS_BLOCKING_RULES} reserves, so the forbidden floor now guards rules a
 * REAL gate emits (no inert surface). A downstream project composes its own gates
 * onto this set.
 */
export const LITESHIP_GATES: readonly Gate[] = [
  noBareThrowGate,
  noTsIgnoreGate,
  noNondeterminismGate,
  noSilentCatchGate,
  noSkippedTestGate,
  noPlaceholderGate,
];

/**
 * The HOST gate set — what the CLI runs WHEN it has built + injected the repo-IR
 * (Slice B, B1, step 3). It is {@link LITESHIP_GATES} with the regex
 * {@link noBareThrowGate} RE-EXPRESSED as the IR-fold {@link noBareThrowIRGate}
 * (same ruleId — the faithful substrate swap, NOT a second gate double-counting
 * the same rule; the parity test proves the fold reproduces the regex gate's real
 * findings and is strictly more precise), PLUS the {@link noDefaultExportDivergenceGate}
 * — the live triangulated cross-check over the two `is-default-export` oracles —
 * PLUS the B3.2 sibling cross-checks {@link noVarDivergenceGate} (the
 * `var-declaration` property) and {@link noRequireDivergenceGate} (the
 * `require-call` property). All three are instances of the same parametric
 * `makeOracleDivergenceGate` factory — the proof the triangulated-oracle layer is
 * a reusable LAYER, not a one-off.
 *
 * These IR-fold gates {@link requireIR}, so they CANNOT run on the lean
 * MCP/command path (no IR) — they appear ONLY here, the IR-present composition. The
 * lean {@link LITESHIP_GATES} default is unchanged: `czap check` / MCP still runs
 * the six regex gates IR-free.
 */
export const LITESHIP_IR_GATES: readonly Gate[] = [
  noBareThrowIRGate,
  noTsIgnoreGate,
  noNondeterminismGate,
  noSilentCatchGate,
  noSkippedTestGate,
  noPlaceholderGate,
  noDefaultExportDivergenceGate,
  noVarDivergenceGate,
  noRequireDivergenceGate,
  symbolOrphanDivergenceGate,
  crdtLawsGate,
  // The avionics-tier (Slice C) performance-contracts gate — a LEAN, deterministic
  // fold over the committed `benchmarks/` artifacts (read via context.readFile). It
  // does NOT requireIR, but it belongs in the IR-host set alongside the other Slice
  // B/C gates (the IR-present composition), NOT the lean cut LITESHIP_GATES.
  performanceContractsGate,
  // The claim-vs-reality perf-claim gate — a perf claim (`zero-alloc` / `fast-path` /
  // `O(1)` …) in published src that no bench measures is a finding. Same lean
  // byte-fold shape as the performance-contracts gate; rides the IR-host set.
  perfClaimBenchGate,
  // The claim-vs-reality SEMANTIC-claim gate — a property claim (`deterministic` /
  // `pure` / `content-addressed` / `canonical`) in published src that no MEASURABLE
  // confirmer backs (a determinism test / an in-file ambient-entropy check / a
  // content-address round-trip test) is a finding. Same lean byte-fold shape as the
  // perf-claim gate (no IR); rides the IR-host set alongside it, never the lean cut.
  claimPropertyGate,
];

/** Options for {@link runGauntletOnRepo}. */
export interface RunGauntletOnRepoOptions {
  /** Absolute root of the repo to run against. */
  readonly repoRoot: string;
  /** Repo-relative glob patterns selecting the files the gates consider. */
  readonly globs: readonly string[];
  /**
   * The INJECTED SOUND skip detector (the AST detector) — OPTIONAL. The gauntlet is the lean
   * engine and never deps `typescript`; a host (the CLI, which deps `@czap/audit`) builds
   * `detectSkipsAST` and threads it here, where it lands on the {@link GateContext} for the
   * no-skipped-test gate to use via `(context.skipDetector ?? detectSkips)`. Omit it (the lean
   * path: `czap check` / MCP) and the token `detectSkips` fallback runs unchanged.
   */
  readonly skipDetector?: (source: string) => readonly SkipMatch[];
  /**
   * The INJECTED repo-IR (Slice B) — OPTIONAL. The gauntlet is the lean engine
   * and never builds an IR; a host (the CLI, via `@czap/audit`'s `ts.Program`)
   * builds it and threads it here, where it lands on the {@link GateContext} for
   * an IR-fold gate to read. Omit it (the lean path: `czap check` / MCP) and the
   * regex gates run unchanged.
   */
  readonly ir?: RepoIR;
  /**
   * The INJECTED supply-chain facts (Slice C, the avionics tier) — OPTIONAL. A
   * host (the CLI's `@czap/cli` analyzer) parses the lockfile, builds the SBOM,
   * and scans the workflows, then threads the decided {@link SupplyChainFacts}
   * here, where they land on the {@link GateContext} for `supplyChainGate` to
   * fold. Omit them (the default `--ir` run) and the gate is simply not in the
   * set — no facts computed, no SBOM cost, no `not-evidenced` noise.
   */
  readonly supplyChain?: SupplyChainFacts;
  /**
   * The INJECTED mutation facts (Slice C, the avionics tier — mutation-as-divergence)
   * — OPTIONAL. A host (`@czap/audit`'s mutation engine + the CLI's per-mutant vitest
   * runner) generates + evaluates the mutants, then threads the decided
   * {@link MutationFacts} here, where they land on the {@link GateContext} for
   * `mutationDivergenceGate` to fold. Omit them (the default `--ir` run) and the gate
   * is simply not in the set — no mutants generated, no suite-runs, no cost.
   */
  readonly mutation?: MutationFacts;
  /**
   * The INJECTED MC/DC facts (the avionics tier — DO-178B Level A's coverage requirement,
   * realized as condition-level mutation) — OPTIONAL. A host (`@czap/audit`'s
   * condition-mutation engine + the CLI's per-pin vitest runner) generates + evaluates
   * the force-true/force-false pins per atomic condition, folds the two pins per
   * condition, then threads the decided {@link McdcFacts} here, where they land on the
   * {@link GateContext} for `mcdcCoverageGate` to fold. Omit them (the default `--ir`
   * run) and the gate is simply not in the set — no condition-mutants generated, no
   * suite-runs, no cost.
   */
  readonly mcdc?: McdcFacts;
  /**
   * The INJECTED DST (deterministic-simulation) facts (the avionics tier — the
   * determinism spine) — OPTIONAL. A host (the CLI's `czap check --ir --simulate`
   * path) drives the scenario corpus through the `@czap/core/simulation` harness
   * (replaying each seed twice, content-addressing the two byte-exact traces) and
   * threads the decided {@link SimulationFacts} here, where they land on the
   * {@link GateContext} for `simulationDeterminismGate` to fold. Omit them (the
   * default `--ir` run) and the gate is simply not in the set — no world minted, no
   * scenario run, no cost.
   */
  readonly simulation?: SimulationFacts;
  /**
   * The INJECTED requirements-traceability facts (the avionics-tier ledger,
   * DO-178B-style) — OPTIONAL. A host (the CLI's
   * `packages/cli/src/lib/traceability.ts` state machine) parses `traceability/*.yaml`,
   * scans the corpus for `// PROVES:` headers, runs the lifecycle fold against the
   * injected wall-clock date, and threads the decided {@link TraceabilityFacts} here,
   * where they land on the {@link GateContext} for `traceabilityBridgeGate` to fold.
   * Omit them (the lean path) and the gate is simply not in the set — no YAML parse,
   * no corpus scan, no cost.
   */
  readonly traceability?: TraceabilityFacts;
  /**
   * The INJECTED standards-integrity facts (the AGENT-SAFETY META-GAUNTLET, the
   * "raccoon rule") — OPTIONAL. A host (the CLI's
   * `packages/cli/src/lib/standards-surface.ts` extractor) reads the live standards
   * surface, content-addresses it, diffs it against the committed snapshot, applies the
   * owner sign-offs against the injected wall-clock date, and threads the decided
   * {@link StandardsIntegrityFacts} here, where they land on the {@link GateContext} for
   * `standardsIntegrityGate` to fold. Omit them (the lean path) and the gate is simply
   * not in the set — no surface read, no addressing cost.
   */
  readonly standards?: StandardsIntegrityFacts;
  /**
   * The INJECTED taint-flow facts (the TAINT-ANALYSIS family) — OPTIONAL. A host (the
   * CLI's `czap check --ir --taint` path) traces the source→sink dataflow via
   * `@czap/audit`'s GENERIC taint oracle (classified by the host-injected LiteShip
   * source/sink/sanitizer registry) and threads the decided {@link TaintFacts} here,
   * where they land on the {@link GateContext} for `taintFlowGate` to fold. Omit them
   * (the default `--ir` run) and the gate is simply not in the set — no dataflow trace,
   * no cost.
   */
  readonly taint?: TaintFacts;
  /**
   * The INJECTED decode-fuzz facts (the untrusted-byte decode-surface hardening) —
   * OPTIONAL. A host (the `tests/fuzz` decode fuzzer, driven by the CLI fuzz path)
   * hammers every L4 decoder with the committed `tests/fixtures/fuzz-corpus` seeds +
   * a fixed, seeded count of `fast-check` generated inputs, classifies each outcome,
   * and threads the decided {@link FuzzCorpusFacts} here, where they land on the
   * {@link GateContext} for `fuzzCorpusGate` to fold. Omit them (the lean path) and
   * the gate is simply not in the set — no fuzzer run, no cost.
   */
  readonly fuzzCorpus?: FuzzCorpusFacts;
  /**
   * The INJECTED proof-strength facts (the LOCAL-VS-GLOBAL correctness family — the
   * lax-functor) — OPTIONAL. A host (the CLI's `czap check --ir --proof` path) reads
   * the proof signals (mutation score / coverage / property tests / enrolled
   * invariants), blends them into per-module scalars, and threads the decided
   * {@link ProofFacts} here, where they land on the {@link GateContext} for
   * `proofPropagationGate` to propagate along the dep DAG. Omit them (the default
   * `--ir` run) and the gate is simply not in the set — no signal reads, no cost.
   */
  readonly proof?: ProofFacts;
  /**
   * The INJECTED composition-coverage facts (the LOCAL-VS-GLOBAL correctness family —
   * "locally green, globally untested interaction") — OPTIONAL. A host (the CLI's
   * `czap check --ir --composition` path) derives the interaction edges from the IR
   * call graph and classifies each integration-covered/uncovered, then threads the
   * decided {@link CompositionFacts} here, where they land on the {@link GateContext}
   * for `compositionCoverageGate` to fold. Omit them (the default `--ir` run) and the
   * gate is simply not in the set — no corpus scan, no cost.
   */
  readonly composition?: CompositionFacts;
}

/**
 * Run `gates` over the real repo at `opts.repoRoot`, scoped to `opts.globs`.
 * Equivalent to `runGates(gates, nodeContext(opts.repoRoot, opts.globs), runOpts)`
 * — the `runOpts` (assurance map, waivers, injected clock) flow straight through,
 * so a real-repo run gets the SAME level-scoping + waiver mechanism the in-memory
 * path uses. Without `runOpts.assuranceMap` every gate sees all globbed files
 * (back-compat); with it each gate is aimed at its level (no red-drowning).
 */
export function runGauntletOnRepo(
  gates: readonly Gate[],
  opts: RunGauntletOnRepoOptions,
  runOpts: RunGatesOptions = {},
): GauntletResult {
  // The base context carries the positional facts; the LOCAL-VS-GLOBAL family's
  // proof/composition facts are spread on additively (so the brittle positional
  // nodeContext signature is not widened for every new fact family). Omit each key
  // when absent so an opt-in-free run's context shape is unchanged.
  const baseContext = nodeContext(
    opts.repoRoot,
    opts.globs,
    opts.ir,
    opts.supplyChain,
    opts.mutation,
    opts.simulation,
    opts.traceability,
    opts.standards,
    opts.mcdc,
    opts.fuzzCorpus,
  );
  const context =
    opts.proof !== undefined ||
    opts.composition !== undefined ||
    opts.taint !== undefined ||
    opts.skipDetector !== undefined
      ? {
          ...baseContext,
          ...(opts.proof !== undefined ? { proof: opts.proof } : {}),
          ...(opts.composition !== undefined ? { composition: opts.composition } : {}),
          ...(opts.taint !== undefined ? { taint: opts.taint } : {}),
          // The SOUND AST skip detector (injected by the CLI host); spread additively so the
          // brittle positional nodeContext signature is not widened. Omitted ⇒ token fallback.
          ...(opts.skipDetector !== undefined ? { skipDetector: opts.skipDetector } : {}),
        }
      : baseContext;
  return runGates(gates, context, runOpts);
}

/**
 * The default JUDGED scope: every package's TypeScript source. This is the surface the
 * gates FLAG findings on — narrow on purpose (a gate must not red a finding outside the
 * published, downstream-installable tree).
 *
 * The CONFIRMER EVIDENCE a claim-vs-reality gate reads (the test corpus a determinism /
 * round-trip test lives in) is NOT judged — it is read through the context's unscoped
 * `allFiles()` (see {@link nodeContext}'s `confirmerGlobs`), so it never enters this
 * judged scope and never makes another gate (no-placeholder, traceability) fire on a
 * test file. Keeping the judged scope at published source while the confirmer corpus
 * reads the test tree is the precise fix for the claim-property honesty bug WITHOUT the
 * collateral of broadening every gate's judged surface.
 */
export const DEFAULT_GAUNTLET_GLOBS: readonly string[] = ['packages/*/src/**/*.ts'];

/**
 * The PRODUCTION gauntlet run — the live composition the dogfood path calls.
 *
 * Binds the real built-in {@link LITESHIP_GATES}, the committed
 * {@link LITESHIP_ASSURANCE_MAP} (so each gate is aimed at its level), and the
 * committed {@link LITESHIP_WAIVERS} (so the declared boundaries are suppressed
 * and a stale/expired waiver re-reds) into ONE call over the real repo. `now` is
 * injected — never `Date.now()` — so the waiver-expiry verdict is deterministic
 * and a test can drive the clock past a boundary review to prove the teeth fire.
 *
 * This is what makes the committed waivers actually GOVERN: the waivers in
 * `waivers.ts` are evaluated against the real findings this run surfaces, scoped
 * per-gate by ruleId in {@link runGates}. A boundary waiver that matches nothing
 * goes stale (warning); one whose `expires` is past `now` re-reds and blocks.
 *
 * The optional `ir` is the INJECTED repo-IR (Slice B). The LEAN path (`czap
 * check` / MCP — `@czap/command/host`) calls this with NO `ir`: the regex gates
 * run unchanged and an IR-fold gate (Step 3) folds only when an IR is present.
 * The HOST path (the CLI/scripts, where `@czap/audit` is available) builds the
 * IR via `buildRepoIR` and threads it here, landing it on every gate's context.
 *
 * @param repoRoot Absolute root the gates resolve against.
 * @param now      The injected clock for waiver-expiry evaluation (REQUIRED — the
 *                 caller owns the date so the verdict is reproducible).
 * @param globs    The file scope (defaults to every package's source).
 * @param ir       Optional pre-built repo-IR to inject (the host path).
 * @param skipDetector Optional host-built SOUND AST skip detector (`@czap/audit`'s
 *                 `detectSkipsAST`). The no-skipped-test gate uses it via
 *                 `(context.skipDetector ?? detectSkips)` — so the LEAN path, when run
 *                 from a host that deps `@czap/audit` (the CLI's `czap check` / `czap
 *                 lsp`), gains the line-agnostic multi-line/ASI/inner-describe/alias
 *                 detection + the structural conditionality proof. Omitted on the
 *                 no-`@czap/audit` path (MCP) → the token fallback (the documented lean
 *                 degradation, like `runCheckInvariants`).
 */
export function litelaunchGauntlet(
  repoRoot: string,
  now: Date,
  globs: readonly string[] = DEFAULT_GAUNTLET_GLOBS,
  ir?: RepoIR,
  skipDetector?: (source: string) => readonly SkipMatch[],
): GauntletResult {
  return runGauntletOnRepo(
    LITESHIP_GATES,
    {
      repoRoot,
      globs,
      ...(ir !== undefined ? { ir } : {}),
      ...(skipDetector !== undefined ? { skipDetector } : {}),
    },
    { assuranceMap: LITESHIP_ASSURANCE_MAP, waivers: LITESHIP_WAIVERS, now },
  );
}

/**
 * The HOST gauntlet run (Slice B, B1, step 3) — the IR-INJECTED composition the
 * CLI calls once it has built the repo-IR via `@czap/audit`. Binds
 * {@link LITESHIP_IR_GATES} (the lean set with no-bare-throw re-expressed as an IR
 * fold + the oracle-divergence gate) and threads the REQUIRED `ir` onto every
 * gate's context, with the same committed assurance map + waivers + injected
 * clock as {@link litelaunchGauntlet}.
 *
 * The `ir` is mandatory here (the IR-fold gates {@link requireIR}); the lean path
 * keeps calling {@link litelaunchGauntlet} with no IR and runs the six regex gates
 * unchanged. This is the ONE place the IR-fold gates run — so the engine stays
 * lean (no `typescript`) and the lean MCP/command path is unaffected.
 *
 * B3.4 — ASSURANCE-LEVEL EDGE PROPAGATION: because the IR is present, this run
 * PROPAGATES assurance levels along the import graph ("AUTHORITY decides
 * assurance, not folder names"): a file (transitively) imported by an L4 file
 * inherits at least L4. The propagated effective levels (floored by the glob map,
 * raised along import edges via {@link propagateAssuranceLevels}) are threaded into
 * the engine as `effectiveLevels`, where they drive BOTH level-scoping (a file
 * pulled into an L4 path is in an L4 gate's band) AND finding-level elevation (a
 * finding on such a file is reported at L4). The lean {@link litelaunchGauntlet}
 * path has no IR and so no propagation — its glob-only levels are unchanged.
 */
export function litelaunchGauntletWithIR(
  repoRoot: string,
  now: Date,
  ir: RepoIR,
  globs: readonly string[] = DEFAULT_GAUNTLET_GLOBS,
  cacheOpts: LitelaunchCacheOptions = {},
): GauntletResult {
  // Propagate the committed glob map's levels along the IR's import edges: a file
  // pulled into an L4 path inherits >= L4. The base (floor) of every file is its
  // glob level via the committed LITESHIP_ASSURANCE_MAP; the propagation only ever
  // raises it. Deterministic, cycle-safe, bounded (levels L0..L4 only rise).
  const effectiveLevels = propagateAssuranceLevels(ir, (file) => levelOf(file, LITESHIP_ASSURANCE_MAP));
  return runGauntletOnRepo(
    // The gate set is the IR-host default UNLESS the host overrides it (the
    // `--supply-chain` opt-in composes `supplyChainGate` on for that run only).
    cacheOpts.gates ?? LITESHIP_IR_GATES,
    {
      repoRoot,
      globs,
      ir,
      // Inject the host-computed supply-chain facts onto the context (Slice C) when
      // supplied — `supplyChainGate` folds them. Omitted ⇒ absent ⇒ the gate (when
      // in the set) advisories "not-evidenced"; but on the default run the gate is
      // not in the set at all, so there is no facts cost and no advisory noise.
      ...(cacheOpts.supplyChain !== undefined ? { supplyChain: cacheOpts.supplyChain } : {}),
      // Inject the host-computed mutation facts (Slice C) when supplied —
      // `mutationDivergenceGate` folds them. Omitted ⇒ absent ⇒ the gate is not in
      // the set at all on the default `--ir` run (mutation is opt-in: `--mutate`).
      ...(cacheOpts.mutation !== undefined ? { mutation: cacheOpts.mutation } : {}),
      // Inject the host-computed MC/DC facts (the avionics MC/DC tier) when supplied —
      // `mcdcCoverageGate` folds them. Omitted ⇒ absent ⇒ the gate is not in the set at
      // all on the default `--ir` run (MC/DC is opt-in: `--mcdc`).
      ...(cacheOpts.mcdc !== undefined ? { mcdc: cacheOpts.mcdc } : {}),
      // Inject the host-computed DST (simulation) facts when supplied —
      // `simulationDeterminismGate` folds them. Omitted ⇒ absent ⇒ the gate is not in
      // the set at all on the default `--ir` run (simulation is opt-in: `--simulate`).
      ...(cacheOpts.simulation !== undefined ? { simulation: cacheOpts.simulation } : {}),
      // Inject the host-computed taint-flow facts (the TAINT-ANALYSIS family) when
      // supplied — `taintFlowGate` folds them. Omitted ⇒ absent ⇒ the gate is not in
      // the set at all on the default `--ir` run (taint is opt-in: `--taint`).
      ...(cacheOpts.taint !== undefined ? { taint: cacheOpts.taint } : {}),
      // Inject the host-computed requirements-traceability facts when supplied —
      // `traceabilityBridgeGate` folds them. Omitted ⇒ absent ⇒ the gate is not in the
      // set at all. The CLI composes the gate + injects these always-on on the `--ir`
      // path (the committed ledger is cheap to fold).
      ...(cacheOpts.traceability !== undefined ? { traceability: cacheOpts.traceability } : {}),
      // Inject the host-computed standards-integrity facts when supplied —
      // `standardsIntegrityGate` folds them. Omitted ⇒ absent ⇒ the gate is not in the
      // set at all. The CLI composes the gate + injects these ALWAYS-ON on the `--ir`
      // path (the committed snapshot diff is cheap to fold), the raccoon-rule backstop.
      ...(cacheOpts.standards !== undefined ? { standards: cacheOpts.standards } : {}),
      // Inject the host-computed proof-strength facts (the LOCAL-VS-GLOBAL lax-functor)
      // when supplied — `proofPropagationGate` propagates them along the dep DAG.
      // Omitted ⇒ absent ⇒ the gate is not in the set (proof is opt-in: `--proof`).
      ...(cacheOpts.proof !== undefined ? { proof: cacheOpts.proof } : {}),
      // Inject the host-computed composition-coverage facts (the untested-interaction
      // analysis) when supplied — `compositionCoverageGate` folds them. Omitted ⇒
      // absent ⇒ the gate is not in the set (composition is opt-in: `--composition`).
      ...(cacheOpts.composition !== undefined ? { composition: cacheOpts.composition } : {}),
      // Inject the host-built SOUND AST skip detector (`detectSkipsAST`) when supplied — the
      // no-skipped-test gate uses it via `(context.skipDetector ?? detectSkips)`, gaining the
      // line-agnostic multi-line/ASI/inner-describe coverage + the structural F2 conditionality.
      // Omitted ⇒ the token `detectSkips` fallback runs unchanged (the lean path).
      ...(cacheOpts.skipDetector !== undefined ? { skipDetector: cacheOpts.skipDetector } : {}),
    },
    {
      assuranceMap: LITESHIP_ASSURANCE_MAP,
      effectiveLevels,
      waivers: LITESHIP_WAIVERS,
      now,
      // The cache is ARMED only when the host supplies BOTH a store and a
      // toolchainDigest (the engine treats a store without a digest as no cache
      // anyway). Threaded straight through to runGates — the gauntlet stays lean
      // (the store + the digest are host-built; the engine just consumes them).
      ...(cacheOpts.cache !== undefined ? { cache: cacheOpts.cache } : {}),
      ...(cacheOpts.toolchainDigest !== undefined ? { toolchainDigest: cacheOpts.toolchainDigest } : {}),
      ...(cacheOpts.env !== undefined ? { env: cacheOpts.env } : {}),
    },
  );
}

/**
 * The INJECTED verdict-cache options the host threads into
 * {@link litelaunchGauntletWithIR} (Slice B, B2). All optional — omit them and the
 * run is a full, uncached run (back-compat). The {@link GateVerdictCache} store
 * and the `toolchainDigest` are HOST-built (the CLI owns `fs` + crypto); the lean
 * engine only consumes them.
 */
export interface LitelaunchCacheOptions {
  /** The injected verdict store (fs-backed in the CLI host). */
  readonly cache?: GateVerdictCache;
  /** The host's toolchain digest (gauntlet dist + version + env) — the anti-lie keystone. */
  readonly toolchainDigest?: string;
  /** The environment fingerprint folded into every key. */
  readonly env?: Readonly<Record<string, string>>;
  /**
   * OPTIONAL gate-set override (Slice C, the `--supply-chain` opt-in). Defaults to
   * {@link LITESHIP_IR_GATES}. The host composes `supplyChainGate` onto the IR-host
   * set for a `--supply-chain` run only; the default `--ir` run leaves it unset, so
   * the avionics gate never appears (no `not-evidenced` noise on the default path).
   */
  readonly gates?: readonly Gate[];
  /**
   * OPTIONAL host-computed supply-chain facts (Slice C) threaded onto the
   * {@link GateContext} for `supplyChainGate` to fold. Supplied ONLY on the
   * `--supply-chain` run, alongside a `gates` override that includes the gate.
   */
  readonly supplyChain?: SupplyChainFacts;
  /**
   * OPTIONAL host-computed mutation facts (Slice C — mutation-as-divergence) threaded
   * onto the {@link GateContext} for `mutationDivergenceGate` to fold. Supplied ONLY
   * on the `czap check --ir --mutate` run, alongside a `gates` override that includes
   * the gate. The cache key is namespaced by the mutation mode (a mutation-run
   * verdict can never be served to a non-mutation run, or vice versa).
   */
  readonly mutation?: MutationFacts;
  /**
   * OPTIONAL host-computed MC/DC facts (the avionics tier — DO-178B Level A coverage via
   * condition-level mutation) threaded onto the {@link GateContext} for
   * `mcdcCoverageGate` to fold. Supplied ONLY on the `czap check --ir --mcdc` run,
   * alongside a `gates` override that includes the gate. The cache key is namespaced by
   * the MC/DC mode (an MC/DC verdict can never be served to a non-MC/DC run, or vice
   * versa) — exactly the `--mutate` cache-soundness lesson.
   */
  readonly mcdc?: McdcFacts;
  /**
   * OPTIONAL host-computed DST (deterministic-simulation) facts (the determinism
   * spine) threaded onto the {@link GateContext} for `simulationDeterminismGate` to
   * fold. Supplied ONLY on the `czap check --ir --simulate` run, alongside a `gates`
   * override that includes the gate. The cache key is namespaced by the simulation
   * mode (a simulation-run verdict can never be served to a non-simulation run, or
   * vice versa).
   */
  readonly simulation?: SimulationFacts;
  /**
   * OPTIONAL host-computed taint-flow facts (the TAINT-ANALYSIS family) threaded onto
   * the {@link GateContext} for `taintFlowGate` to fold. Supplied ONLY on the
   * `czap check --ir --taint` run, alongside a `gates` override that includes the gate.
   * The cache key is namespaced by the taint mode (a taint-run verdict can never be
   * served to a non-taint run, or vice versa) — exactly the `--mutate` cache-soundness
   * lesson.
   */
  readonly taint?: TaintFacts;
  /**
   * OPTIONAL host-computed requirements-traceability facts (the avionics-tier ledger)
   * threaded onto the {@link GateContext} for `traceabilityBridgeGate` to fold.
   * Supplied alongside a `gates` override that includes the gate. The CLI runs this
   * ALWAYS-ON on the `--ir` path (the committed ledger is cheap to fold), so its
   * verdict varies only with the ledger + the corpus headers + the date — it carries
   * no separate cache mode (the env fingerprint + toolchain digest already key it).
   */
  readonly traceability?: TraceabilityFacts;
  /**
   * OPTIONAL host-computed standards-integrity facts (the AGENT-SAFETY META-GAUNTLET,
   * the "raccoon rule") threaded onto the {@link GateContext} for
   * `standardsIntegrityGate` to fold. Supplied alongside a `gates` override that
   * includes the gate. The CLI runs this ALWAYS-ON on the `--ir` path (the committed
   * snapshot diff is cheap to fold), so its verdict varies only with the live standards
   * surface + the committed snapshot + the sign-offs + the date — it carries no separate
   * cache mode (the env fingerprint + toolchain digest already key it).
   */
  readonly standards?: StandardsIntegrityFacts;
  /**
   * OPTIONAL host-computed proof-strength facts (the LOCAL-VS-GLOBAL correctness family
   * — the lax-functor) threaded onto the {@link GateContext} for `proofPropagationGate`
   * to propagate along the dep DAG. Supplied ONLY on the `czap check --ir --proof` run,
   * alongside a `gates` override that includes the gate. The proof MODE namespaces the
   * verdict cache key (a proof-run verdict can never be served to a non-proof run, or
   * vice versa) — the same `--mutate` cache-soundness lesson.
   */
  readonly proof?: ProofFacts;
  /**
   * OPTIONAL host-computed composition-coverage facts (the LOCAL-VS-GLOBAL correctness
   * family — "locally green, globally untested interaction") threaded onto the
   * {@link GateContext} for `compositionCoverageGate` to fold. Supplied ONLY on the
   * `czap check --ir --composition` run, alongside a `gates` override that includes the
   * gate. The composition MODE namespaces the verdict cache key.
   */
  readonly composition?: CompositionFacts;
  /**
   * OPTIONAL host-built SOUND AST skip detector (`@czap/audit`'s `detectSkipsAST`) threaded onto
   * the {@link GateContext} as `skipDetector`. The no-skipped-test gate uses it via
   * `(context.skipDetector ?? detectSkips)` — gaining line-agnostic multi-line/ASI/inner-describe
   * detection + the structural F2 conditionality the token scanner cannot produce. Supplied
   * ALWAYS-ON on the `--ir` path (the host deps `@czap/audit`, the parse is cheap); omitted on the
   * lean `czap check` / MCP path, where the token `detectSkips` fallback runs unchanged.
   */
  readonly skipDetector?: (source: string) => readonly SkipMatch[];
}
