/**
 * The gate — a fitness function over the repo, and the unit of extensibility.
 *
 * A gate is `(context) => Finding[]`: it folds over what it is given and emits
 * {@link Finding}s. A consumer registers their own gate the same way LiteShip
 * registers its built-ins — no fork, no rebuild. That is the whole plugin API.
 *
 * The authority ratchet is encoded in the TYPE: a {@link Gate} cannot be
 * constructed without {@link GateFixtures} (a red that must fail it, a green
 * that must pass, a mutation its own fixtures must kill). A gate that has not
 * self-proven against those fixtures can only ever be `advisory` — it earns
 * blocking authority, it is not granted it. (See `authority.ts`.)
 *
 * @module
 */

import { ValidationError, HostCapabilityError } from '@czap/error';
import type { AssuranceLevel } from './assurance.js';
import type { EarlyReturnMatch } from './gates/early-return-detect.js';
import type { Finding } from './finding.js';
import type { FileId, RepoIR } from './repo-ir.js';
import type { SupplyChainFacts } from './supply-chain-facts.js';
import type { MutationFacts } from './mutation-facts.js';
import type { McdcFacts } from './mcdc-facts.js';
import type { SimulationFacts } from './simulation-facts.js';
import type { TraceabilityFacts } from './traceability-facts.js';
import type { StandardsIntegrityFacts } from './standards-facts.js';
import type { DeclaredFixFacts } from './declared-fix.js';
import type { TaintFacts } from './taint-facts.js';
import type { CapabilityLinkFacts } from './capability-link-facts.js';
import type { FuzzCorpusFacts } from './fuzz-facts.js';
import type { ProofFacts } from './proof-facts.js';
import type { CompositionFacts } from './composition-facts.js';
import type { SkipMatch } from './gates/skip-detect.js';
import type { SkipSiteFacts } from './skip-site-facts.js';
import type { ActiveSurfaceFacts } from './active-surface-facts.js';
import { factAccessEvidenceDigest, stableEvidenceDigest } from './verdict-cache.js';

/**
 * What a gate runs against. Slice A keeps it minimal + extensible; Slice B
 * widens it with the triangulated repo-IR (LanguageService + AST + module graph
 * + receipts + schema). A gate reads ONLY through this context, so the same gate
 * runs against the real repo and against an in-memory fixture unchanged.
 */
export interface GateContext {
  /** Absolute root the gate's paths resolve against. */
  readonly repoRoot: string;
  /** Read a repo-relative file's text, or `undefined` if absent. */
  readFile(relativePath: string): string | undefined;
  /** Repo-relative paths the gate may consider (already filtered to its scope). */
  files(): readonly string[];
  /**
   * The UNSCOPED repo-relative file list — every path the context globs, BEFORE
   * level-scoping narrows {@link files} to a gate's band. OPTIONAL (a context that
   * predates this accessor omits it; a reader falls back to {@link files}).
   *
   * Why this exists: {@link files} is level-SCOPED (a gate at L3 only sees files at
   * L3+). That is correct for the JUDGED surface — a gate should only flag findings in
   * its band. But a CONFIRMER-reading gate (the claim-vs-reality family) needs the
   * test corpus as EVIDENCE, and the test corpus sits BELOW the gate's level (tests are
   * not L3 source). Scoping the evidence away makes every claim read as unconfirmed — a
   * false finding born of scope (the honesty bug that made the claim-property gate flag
   * 1000+ untested claims in production while its own test, globbing the full corpus,
   * stayed green). `allFiles` is the unscoped evidence corpus, preserved verbatim
   * through {@link scopeContextByLevel} exactly as {@link readFile} is — so a confirmer
   * gate reads the SAME corpus in production as in its self-test. The JUDGED surface is
   * still `files()` (scoped); only the confirmer EVIDENCE reads `allFiles()`.
   */
  allFiles?(): readonly string[];
  /**
   * The SOUND skip detector — an INJECTED capability (the AST detector, the cure that ends the
   * token-scanner whack-a-mole). OPTIONAL by design, the SAME lean-engine pattern as {@link ir}:
   * `@czap/gauntlet` carries NO `typescript` dep, so the dependency-free token `detectSkips` is its
   * FALLBACK; the host (the CLI, which deps `@czap/audit`) builds `detectSkipsAST` (a real
   * `ts.createSourceFile` AST walk + local binding analysis + conditionality classification) and
   * injects it here. A skip-reading gate / scan calls `(context.skipDetector ?? detectSkips)(text)`
   * — the AST detector when injected (line-agnostic, catches every multi-line/ASI/inner-describe
   * spelling, and produces the `conditional` F2 discriminant), the token fallback otherwise. When
   * ABSENT the token detector runs unchanged (back-compat; the lean `czap check` path). See
   * {@link SkipMatch}.
   */
  readonly skipDetector?: (source: string) => readonly SkipMatch[];
  /**
   * The SOUND early-return detector — an INJECTED capability. `@czap/gauntlet` carries NO
   * `typescript` dep; the token `detectEarlyReturnBeforeExpect` is its fallback. The host injects
   * `detectEarlyReturnBeforeExpectAST` from `@czap/audit`. The no-early-return-test gate calls
   * `(context.earlyReturnDetector ?? detectEarlyReturnBeforeExpect)(text)`.
   */
  readonly earlyReturnDetector?: (source: string) => readonly EarlyReturnMatch[];
  /**
   * The sound, parser-backed `codeOnly` floor — an INJECTED capability, the same shape as
   * {@link skipDetector}. The lean char-state-machine `codeOnly` (gates/code-only.ts) is the
   * no-typescript FALLBACK; the host (the CLI, which deps `@czap/audit`) builds `codeOnlyAST` (a real
   * `ts.createSourceFile` token walk that the parser disambiguates — regex-vs-division, nested
   * templates, comments) and injects it here. A code-scanning gate calls `(context.codeOnly ?? codeOnly)(text)`
   * — the scanner when injected, the char-machine otherwise. The two are pinned equivalent by the
   * differential test (tests/unit/audit/code-ranges.test.ts), so the fallback stays faithful.
   */
  readonly codeOnly?: (source: string) => string;
  /**
   * The triangulated repo-IR — an INJECTED capability (Slice B). OPTIONAL by
   * design: `@czap/gauntlet` is the lean engine and the IR is built+injected by
   * a host (the CLI, via `@czap/audit`'s `ts.Program`), so the gauntlet never
   * carries the heavy `typescript` dep. An existing regex gate ignores it
   * entirely; a new IR-fold gate that REQUIRES it must guard `ir === undefined`
   * (or use {@link requireIR}, which throws a clear tagged error when no IR was
   * injected). In-memory fixtures and the filesystem context leave it `undefined`
   * until a host supplies one. See {@link RepoIR}.
   */
  readonly ir?: RepoIR;
  /**
   * Pre-computed supply-chain evidence — an INJECTED capability (Slice C, the
   * avionics tier), the same lean-engine pattern as {@link ir}. OPTIONAL: the
   * heavy lockfile parse / SBOM build / ShipCapsule decode / CI scan all live in
   * a HOST (the CLI's `@czap/cli` supply-chain analyzer), which folds them into
   * flat {@link SupplyChainFacts} and lands them here. The
   * {@link supplyChainGate} reads ONLY through this; in-memory fixtures supply a
   * literal facts record (no I/O, no YAML). When ABSENT the supply-chain gate
   * reports an honest advisory "not-evidenced" finding rather than a silent
   * green. See {@link SupplyChainFacts}.
   */
  readonly supplyChain?: SupplyChainFacts;
  /**
   * Pre-computed mutation evidence — an INJECTED capability (Slice C, the avionics
   * tier — mutation-as-divergence), the same lean-engine pattern as {@link ir} and
   * {@link supplyChain}. OPTIONAL: the heavy AST mutation + the per-mutant vitest
   * runs all live in a HOST (`@czap/audit`'s mutation engine + the CLI's vitest
   * runner), which folds them into flat {@link MutationFacts} (every mutant's
   * kill/survive verdict + the committed score baseline) and lands them here. The
   * {@link mutationDivergenceGate} reads ONLY through this; in-memory fixtures
   * supply a literal facts record (no parse, no test run). When ABSENT the gate is
   * simply not in the set (mutation is opt-in: `czap check --ir --mutate`), so
   * there is no per-mutant cost and no noise on a default run. See
   * {@link MutationFacts}.
   */
  readonly mutation?: MutationFacts;
  /**
   * Pre-computed MC/DC (Modified Condition/Decision Coverage) evidence — an INJECTED
   * capability (the avionics tier — DO-178B Level A's coverage requirement, realized as
   * CONDITION-LEVEL MUTATION), the same lean-engine pattern as {@link mutation}.
   * OPTIONAL: the heavy work (decomposing every L4 decision into its atomic conditions,
   * minting the force-true/force-false pin per condition, running the covering tests per
   * pin) all lives in a HOST (`@czap/audit`'s condition-mutation engine + the CLI's
   * per-mutant vitest runner), which folds the two pins per condition into flat
   * {@link McdcFacts} (each condition MC/DC-covered iff BOTH pins were KILLED) and lands
   * them here. The {@link mcdcCoverageGate} reads ONLY through this; in-memory fixtures
   * supply a literal facts record (no parse, no test run). When ABSENT the gate is simply
   * not in the set (MC/DC is opt-in: `czap check --ir --mcdc`), so there is no per-pin
   * cost and no noise on a default run. See {@link McdcFacts}.
   */
  readonly mcdc?: McdcFacts;
  /**
   * Pre-computed DETERMINISTIC-SIMULATION (DST) evidence — an INJECTED capability
   * (Slice C, the avionics tier), the same lean-engine pattern as {@link ir},
   * {@link supplyChain}, and {@link mutation}. OPTIONAL: the heavy work (minting a
   * seeded world, running the scenario corpus, replaying each seed twice, and
   * content-addressing the byte-exact traces) all lives in a HOST (the CLI's
   * `czap check --ir --simulate` path, driving the `@czap/core/simulation`
   * harness), which folds the verdicts into flat {@link SimulationFacts} (every
   * scenario's two replay digests + any divergence) and lands them here. The
   * {@link simulationDeterminismGate} reads ONLY through this; in-memory fixtures
   * supply a literal facts record (no world, no replay). When ABSENT the gate
   * reports an honest advisory "not-evidenced" finding rather than a silent green.
   * A replay-divergence fact carries its SEED, so the bug it folds replays
   * byte-for-byte. See {@link SimulationFacts}.
   */
  readonly simulation?: SimulationFacts;
  /**
   * Pre-computed REQUIREMENTS-TRACEABILITY evidence — an INJECTED capability (the
   * avionics-tier ledger, DO-178B-style), the same lean-engine pattern as {@link ir},
   * {@link supplyChain}, {@link mutation}, and {@link simulation}. OPTIONAL: the heavy
   * work (parsing `traceability/*.yaml`, scanning the test corpus for `// PROVES:`
   * headers, running the lifecycle state machine against the injected wall-clock date,
   * content-addressing the resolved ledger) all lives in a HOST (the CLI's
   * `packages/cli/src/lib/traceability.ts` state machine), which folds the verdicts
   * into flat {@link TraceabilityFacts} (every invariant's resolved state + any
   * ledger⇔header divergence + the resolved-ledger content address) and lands them
   * here. The {@link traceabilityBridgeGate} reads ONLY through this; in-memory
   * fixtures supply a literal facts record (no YAML, no clock). When ABSENT the gate
   * is simply not in the set. An UNTRACED invariant or an EXPIRED waiver folds to a
   * self-explaining Finding at the invariant's level. See {@link TraceabilityFacts}.
   */
  readonly traceability?: TraceabilityFacts;
  /**
   * Pre-computed STANDARDS-INTEGRITY evidence — an INJECTED capability (the
   * AGENT-SAFETY META-GAUNTLET, the "raccoon rule"), the same lean-engine pattern as
   * {@link ir}, {@link supplyChain}, {@link mutation}, {@link simulation}, and
   * {@link traceability}. OPTIONAL: the heavy work (reading the live standards surface
   * off the gauntlet's own exports + the committed `benchmarks/`/`traceability/`
   * artifacts, content-addressing the surface via the ONE `contentAddressOf` kernel,
   * diffing it against the committed snapshot, applying the owner sign-offs against the
   * injected wall-clock date) all lives in a HOST (the CLI's
   * `packages/cli/src/lib/standards-surface.ts` extractor), which folds the decided
   * verdicts into flat {@link StandardsIntegrityFacts} (the unsigned/signed/forbidden/
   * expired weakenings + the stale strengthens) and lands them here. The
   * {@link standardsIntegrityGate} reads ONLY through this; in-memory fixtures supply a
   * literal facts record (no fs, no clock, no addressing). When ABSENT the gate is
   * simply not exercised. An UNSIGNED weakening folds to a BLOCKING L4 Finding — the
   * raccoon caught. See {@link StandardsIntegrityFacts}.
   */
  readonly standards?: StandardsIntegrityFacts;
  /**
   * Pre-computed DECLARED-FIX evidence — an INJECTED capability (the AGENT-SAFETY
   * META-GAUNTLET, the "raccoon rule", phases B+C — the agent-fix admission control),
   * the same lean-engine pattern as {@link standards}. OPTIONAL by design: it is
   * present ONLY when an agent's AUTO-FIX is being validated (the `--fix` / apply
   * path). The heavy work (measuring the actual change off the working tree, reading
   * the live standards surface BEFORE + AFTER the fix, content-addressing each via the
   * ONE `contentAddressOf` kernel, then running `verifyDeclaredFix` against the
   * declaration) all lives in a HOST (the CLI's agent-fix admission entry point); it
   * folds the decided {@link DeclaredFixFacts} (the verifier's verdict + the declared
   * intent) and lands them here. The {@link declaredFixProtocolGate} reads ONLY through
   * this; in-memory fixtures supply a literal facts record (no fs, no clock, no
   * addressing). When ABSENT (a normal commit, NOT an agent-fix) the gate is SILENT —
   * phase A's commit backstop ({@link standards}) already guards that path. A REJECTED
   * fix (scope-creep / size-exceeded / unsigned or forbidden weakening / forged
   * receipt) folds to a BLOCKING L4 Finding per reason — the raccoon caught on the
   * apply path. The SAME `verifyDeclaredFix` runs at the apply moment (phase B) and
   * here at the commit gate (phase C) — one engine. See {@link DeclaredFixFacts}.
   */
  readonly declaredFix?: DeclaredFixFacts;
  /**
   * Pre-computed TAINT-DATAFLOW evidence — an INJECTED capability (the
   * TAINT-ANALYSIS family), the same lean-engine pattern as {@link ir},
   * {@link supplyChain}, {@link mutation}, {@link simulation}, {@link traceability},
   * and {@link standards}. OPTIONAL: the heavy work (a whole-corpus `ts.Program` +
   * a type-checker dataflow trace from each untrusted SOURCE call to each dangerous
   * SINK call argument, observing the SANITIZER on the path) lives in a HOST
   * (`@czap/audit`'s taint oracle, classified by the LiteShip-LOCAL source/sink/
   * sanitizer registry the `@czap/cli` host injects — the audit engine itself
   * references NO LiteShip policy, ADR-0012/D7b), which folds the traced flows into
   * flat {@link TaintFacts} (every source→sink flow + its sanitizer, if any + the
   * honest interprocedural depth the trace covered) and lands them here. The
   * {@link taintFlowGate} reads ONLY through this; in-memory fixtures supply a
   * literal facts record (no program, no checker). When ABSENT the gate is simply
   * not in the set (taint is opt-in: `czap check --ir --taint`). An UNSANITIZED
   * source→sink flow folds to a Finding at the sink's (propagated) level — L4 for a
   * trust-spine sink. See {@link TaintFacts}.
   */
  readonly taint?: TaintFacts;
  /**
   * The host-supplied {@link CapabilityLinkFacts} (codex round-8, #1b) — the dataflow proof that every
   * sanctioned capability-gated skip's GUARD DERIVES FROM its declared capability's probe. The heavy
   * `ts.Program`/checker `linker` lives in a HOST (`@czap/audit`'s capability-link oracle, fed the
   * canonical capability-module SET + the sanctioned sites the `@czap/cli` host injects — the audit
   * engine names no LiteShip capability, ADR-0012/D7b). The {@link capabilityGateLinkGate} reads ONLY
   * through this; fixtures supply a literal facts record. When ABSENT the gate is not in the set
   * (capability-link is opt-in: `czap check --ir --capability-gate`). A skip whose guard derives from
   * NO capability probe (`if (Math.random())`) — or the WRONG one (a mislabel) — folds to an L4 finding.
   */
  readonly capabilityLink?: CapabilityLinkFacts;
  /**
   * Pre-computed DECODE-FUZZ evidence — an INJECTED capability (the
   * UNTRUSTED-BYTE DECODE-SURFACE hardening), the same lean-engine pattern as
   * {@link ir}, {@link supplyChain}, {@link mutation}, {@link simulation},
   * {@link traceability}, {@link standards}, and {@link taint}. OPTIONAL: the heavy
   * work (hammering every L4 decoder — canonical-CBOR / HLC / GraphPatch /
   * DocumentGraph / ShipCapsule — with the committed `tests/fixtures/fuzz-corpus`
   * seeds + a fixed, seeded count of `fast-check` generated inputs, classifying
   * each outcome as fail-closed-or-typed vs a crash / a prototype-pollution / a
   * misparse) lives in a HOST (the `tests/fuzz` decode fuzzer, driven by the CLI
   * fuzz path), which folds the per-decoder verdicts into flat
   * {@link FuzzCorpusFacts} and lands them here. The {@link fuzzCorpusGate} reads
   * ONLY through this; in-memory fixtures supply a literal facts record (no
   * `fast-check`, no corpus, no decoder). When ABSENT the gate reports an honest
   * advisory "not-evidenced" finding rather than a silent green. A violation fact
   * carries its REPRODUCER (a corpus seed id or a `generated@seed=0x…` source), so
   * the decode crash/pollution it folds replays byte-for-byte. See
   * {@link FuzzCorpusFacts}.
   */
  readonly fuzzCorpus?: FuzzCorpusFacts;
  /**
   * Pre-computed PROOF-STRENGTH evidence — an INJECTED capability (the
   * LOCAL-VS-GLOBAL correctness family — the lax-functor: local proof ≤ weakest
   * dependency), the same lean-engine pattern as {@link ir}, {@link mutation}, and
   * {@link simulation}. OPTIONAL: the heavy work (reading the proof signals —
   * mutation-score baseline, coverage report, property-test presence, the enrolled
   * invariants ledger — and blending them into a per-module proof scalar) lives in a
   * HOST (the CLI's `czap check --ir --proof` path), which folds them into flat
   * {@link ProofFacts} and lands them here. The {@link proofPropagationGate}
   * PROPAGATES the scalar along the IR's dep DAG (the `min`-fixpoint dual of
   * assurance propagation) and reads ONLY through this; in-memory fixtures supply a
   * literal facts record (no report, no ledger). When ABSENT the gate reports an
   * honest advisory "not-evidenced" finding rather than a silent green. A trust-spine
   * module whose GLOBAL proof drops below a floor BECAUSE of a weak dependency folds
   * to a Finding naming the weak-link path. See {@link ProofFacts}.
   */
  readonly proof?: ProofFacts;
  /**
   * Pre-computed COMPOSITION-COVERAGE evidence — an INJECTED capability (the
   * LOCAL-VS-GLOBAL correctness family — "locally green, globally untested
   * interaction"), the same lean-engine pattern as {@link ir} and {@link proof}.
   * OPTIONAL: the heavy work (deriving the interaction edges from the IR call graph,
   * deciding which units are individually tested, and deciding which edges an
   * integration test exercises TOGETHER — by a per-test execution-coverage probe or
   * the sound static-reference proxy) lives in a HOST (the CLI's `czap check --ir
   * --composition` path), which folds the classified edges into flat
   * {@link CompositionFacts} and lands them here. The {@link compositionCoverageGate}
   * reads ONLY through this; in-memory fixtures supply a literal facts record (no
   * call graph, no probe). When ABSENT the gate reports an honest advisory
   * "not-evidenced" finding rather than a silent green. An UNCOVERED L4 interaction
   * edge folds to a Finding at the edge's (propagated) level. See
   * {@link CompositionFacts}.
   */
  readonly composition?: CompositionFacts;
  /**
   * Pre-computed SKIP-SITE evidence — an INJECTED FactPack (the FactGate PoC, the
   * "gate-as-data" ratchet). The PRODUCER (the O(n) repo scan: enumerate the governed
   * corpus, read each file, run the skip detector, and precompute each site's three
   * orthogonal floor inputs — `carriesPlaceholder` / `sanctionMatched` /
   * `capabilityConsistent`) is a HOST-side fold ({@link produceSkipSiteFactsFromContext},
   * wrapping the injected `detectSkipsAST` when present, the token `detectSkips`
   * otherwise). The {@link noSkippedTestFactGate}'s per-site decision KERNEL reads ONLY
   * this — never the file system — so the author surface (`decide(facts)`) physically
   * cannot read undeclared evidence (the structural cure the closure-shaped
   * {@link noSkippedTestGate} could not give: there is no `run(context)` body to hide a
   * read in). When ABSENT the fact gate folds an empty verdict (no facts, nothing judged);
   * the original closure gate is unaffected. See {@link SkipSiteFacts}.
   */
  readonly skipSites?: SkipSiteFacts;
  /**
   * Pre-computed ACTIVE-SURFACE field-read evidence — an INJECTED FactPack (#132).
   * The HOST (`@czap/audit`'s `buildActiveSurfaceFacts`) scans reader paths with
   * TS-AST and lands flat {@link ActiveSurfaceFacts}; the
   * {@link activeModeledSurfaceReaderGate} decides over them. When ABSENT the gate
   * folds an empty verdict. See {@link ActiveSurfaceFacts}.
   */
  readonly activeSurfaceFacts?: ActiveSurfaceFacts;
}

/**
 * A named known-input for self-proof. `context` is the world the gate runs in;
 * the harness asserts the gate's findings against the fixture's role.
 */
export interface GateFixture {
  readonly name: string;
  readonly context: GateContext;
}

/**
 * The three fixtures every gate ships — the authority ratchet's evidence.
 * - `red`: a known-BAD world the gate MUST flag (≥1 finding). No red → no
 *   blocking authority (a gate that cannot demonstrate catching its target is
 *   advisory forever).
 * - `green`: a known-GOOD world the gate MUST pass clean (0 findings) — pins
 *   the false-positive floor.
 * - `mutation`: an operator that mutates the gate's OWN logic; the harness
 *   asserts the mutated gate then FAILS red-or-green — proving the fixtures
 *   actually constrain the logic (tests with teeth, not theatre).
 */
export interface GateFixtures {
  readonly red: GateFixture;
  readonly green: GateFixture;
  readonly mutation: GateMutation;
}

/** A mutation of a gate's own logic + the reason it should be caught. */
export interface GateMutation {
  readonly describe: string;
  /** Return a gate whose `run` is a plausible-but-wrong variant of the original. */
  readonly mutate: (gate: Gate) => Gate;
}

/** A gate — the registered fitness function. */
export interface Gate {
  /** Stable id; namespaces every {@link Finding} it emits (traceability). */
  readonly id: string;
  /** The assurance level this gate operates at — aims its rigor. */
  readonly level: AssuranceLevel;
  /** One-line human description of what it checks. */
  readonly describe: string;
  /** The fold: produce findings for `context`. Pure w.r.t. the context. */
  readonly run: (context: GateContext) => readonly Finding[];
  /**
   * OPTIONAL coverage declaration (Slice B, B2 — the content-addressed cache).
   * Returns the {@link FileId}s whose CONTENT this gate's verdict depends on, so
   * the verdict cache can content-key the gate against exactly those files.
   *
   * SOUNDNESS RAIL: when ABSENT, the cache conservatively assumes the gate covers
   * ALL files in the IR (the safe floor — any repo byte change invalidates the
   * cached verdict). Declaring `coverage` is an OPT-IN narrowing that is sound ONLY
   * when the gate GENUINELY reads only the returned files: an INACCURATE
   * (too-narrow) coverage is a SOUNDNESS BUG — it would serve a stale cached
   * verdict when an uncovered dependency changed. Narrow only when the gate folds
   * over a provably-closed subset (e.g. only files carrying a given fact). The
   * default-to-all floor never has that hazard; prefer it unless the narrowing is
   * demonstrably exact.
   *
   * Pure: derives the FileId set from the IR alone (no I/O, no clock). Only
   * consulted on the cache path; a run with no cache never calls it.
   */
  readonly coverage?: (ir: RepoIR) => readonly FileId[];
  /**
   * OPTIONAL out-of-IR EVIDENCE digest (the verdict-cache soundness keystone). A
   * gate's {@link coverage} (or the default-to-all floor) captures only the bytes
   * IN THE IR (package source built from `auditSourceGlobs`). A gate that reads
   * evidence OUTSIDE the IR — the confirmer test corpus via {@link GateContext.allFiles}
   * (under `tests/`), a `benchmarks/*.json` registry / `tests/bench/*.bench.ts` via
   * {@link GateContext.readFile}, a ledger/snapshot, or the CONTENT of an injected
   * fact ({@link GateContext.mutation} / {@link GateContext.supplyChain} / … whose
   * source bytes are an external artifact) — has evidence the coverage digest CANNOT
   * see. Without folding it, the cache would serve a STALE verdict when that out-of-IR
   * evidence changed while IR source stayed byte-identical (the soundness bug this
   * field cures).
   *
   * Return a deterministic content digest of the EXACT out-of-IR bytes this gate's
   * {@link run} reads — built from the SAME context, via {@link stableEvidenceDigest}
   * (a `(label, bytes)` fold) for file evidence or {@link stableSerialize} for an
   * injected fact. The digest is folded into the cache key alongside the coverage
   * digest, so editing the out-of-IR evidence flips the key → MISS → re-run.
   *
   * A gate that reads ONLY IR files returns `undefined` (or omits this field): the
   * key folds the inert no-evidence marker and the gate's caching is UNCHANGED. The
   * digest MUST cover EXACTLY the gate's out-of-IR reads — an under-fold is the same
   * too-narrow-coverage SOUNDNESS BUG {@link coverage} warns about (fold MORE when in
   * doubt: a needless MISS, never a stale serve).
   *
   * Pure w.r.t. the context (no clock, no ambient I/O beyond the context's own
   * `readFile`/`allFiles`/injected facts). Only consulted on the cache path; a run
   * with no cache never calls it. The context passed is the SAME scoped context
   * `run` receives — `allFiles()`/`readFile` pass through level-scoping verbatim, so
   * the evidence the digest folds matches the evidence `run` reads.
   */
  readonly evidenceDigest?: (context: GateContext) => string | undefined;
  /** The self-proof evidence — required, by construction. */
  readonly fixtures: GateFixtures;
  /**
   * The gate's EXECUTION FORM — the discriminant of the {@link FactGate} variant. Absent
   * (or `'hosted'`) is the default closure gate: an arbitrary {@link run} body that may
   * read anything on the {@link GateContext}. `'fact'` marks a {@link FactGate}: its
   * decision is DATA over a declared, host-produced FactPack, so it cannot read undeclared
   * evidence. Built by {@link defineFactGate}; never hand-set on a hosted gate.
   */
  readonly form?: 'hosted' | 'fact';
  /**
   * (FactGate only) The fact channels this gate's decision DECLARES it consumes — the
   * data analogue of "what evidence does this gate read". The engine folds exactly these
   * channels into the cache key ({@link factBundleDigest}), so cache soundness is
   * STRUCTURAL (not a gate-authored {@link evidenceDigest} you must remember to write).
   */
  readonly requires?: readonly FactKind[];
  /**
   * (FactGate only) The bounded, DATA-ONLY decision: maps the declared FactPack to
   * findings with NO {@link GateContext} access. Set by {@link defineFactGate}; the
   * synthesized {@link run} is `decide(pickFacts(context, requires))`.
   */
  readonly decide?: (facts: FactBundle) => readonly Finding[];
}

/**
 * The runtime tuple of FactKinds a {@link FactGate} may require — the SINGLE SOURCE for the
 * {@link FactKind} type (derived below, never re-typed) AND the runtime allowlist
 * {@link defineFactGate} validates `requires` against (so a misspelled `'skipSite'` fails LOUD
 * at construction instead of silently branding a gate that folds empty facts). Each kind names a
 * host-produced FactPack channel — a field on {@link FactBundle} and an optional key on
 * {@link GateContext}.
 */
export const FACT_KINDS = ['skipSites', 'activeSurfaceFacts'] as const;

/** One FactKind — derived from {@link FACT_KINDS}, never re-typed. */
export type FactKind = (typeof FACT_KINDS)[number];

/**
 * The bundle a {@link FactGate}'s {@link FactGate.decide} receives — ONLY the declared
 * FactPacks, picked off the context by the engine ({@link pickFacts}). It carries no
 * `readFile`, no `allFiles`, no undeclared channel: the decision is data-in, findings-out.
 */
export interface FactBundle {
  readonly skipSites?: SkipSiteFacts;
  readonly activeSurfaceFacts?: ActiveSurfaceFacts;
}

const SKIP_SITE_FORMS = new Set(['call', 'conditional', 'alias', 'computed', 'aliased']);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function ownDataField(record: Record<string, unknown>, field: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, field);
  return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}

function assertPlainFactRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!isPlainRecord(value)) {
    throw ValidationError('FactGate', `${label} must be a plain data object`);
  }
}

function normalizeSkipSiteFacts(value: SkipSiteFacts | undefined): SkipSiteFacts | undefined {
  if (value === undefined) return undefined;
  assertPlainFactRecord(value, 'skipSites');
  const sites = ownDataField(value, 'sites');
  if (!Array.isArray(sites)) {
    throw ValidationError('FactGate', 'skipSites.sites must be an array');
  }
  const normalized = sites.map((site, index) => {
    assertPlainFactRecord(site, `skipSites.sites[${index}]`);
    const file = ownDataField(site, 'file');
    const line = ownDataField(site, 'line');
    const form = ownDataField(site, 'form');
    const token = ownDataField(site, 'token');
    const carriesPlaceholder = ownDataField(site, 'carriesPlaceholder');
    const sanctionMatched = ownDataField(site, 'sanctionMatched');
    const capabilityConsistent = ownDataField(site, 'capabilityConsistent');
    if (
      typeof file !== 'string' ||
      typeof line !== 'number' ||
      !Number.isFinite(line) ||
      typeof form !== 'string' ||
      !SKIP_SITE_FORMS.has(form) ||
      typeof token !== 'string' ||
      typeof carriesPlaceholder !== 'boolean' ||
      typeof sanctionMatched !== 'boolean' ||
      typeof capabilityConsistent !== 'boolean'
    ) {
      throw ValidationError('FactGate', `skipSites.sites[${index}] is malformed`);
    }
    return Object.freeze({
      file,
      line,
      form: form as SkipSiteFacts['sites'][number]['form'],
      token,
      carriesPlaceholder,
      sanctionMatched,
      capabilityConsistent,
    });
  });
  return Object.freeze({ sites: Object.freeze(normalized) });
}

const ACTIVE_SURFACE_PROMOTIONS = new Set(['advisory', 'blocking']);

function normalizeActiveSurfaceFacts(value: ActiveSurfaceFacts | undefined): ActiveSurfaceFacts | undefined {
  if (value === undefined) return undefined;
  assertPlainFactRecord(value, 'activeSurfaceFacts');
  const surfaces = ownDataField(value, 'surfaces');
  if (!Array.isArray(surfaces)) {
    throw ValidationError('FactGate', 'activeSurfaceFacts.surfaces must be an array');
  }
  const normalized = surfaces.map((entry, index) => {
    assertPlainFactRecord(entry, `activeSurfaceFacts.surfaces[${index}]`);
    const family = ownDataField(entry, 'family');
    const requiredFields = ownDataField(entry, 'requiredFields');
    const readFields = ownDataField(entry, 'readFields');
    const active = ownDataField(entry, 'active');
    const readerFiles = ownDataField(entry, 'readerFiles');
    const unreadFields = ownDataField(entry, 'unreadFields');
    const promotion = ownDataField(entry, 'promotion');
    if (
      typeof family !== 'string' ||
      !Array.isArray(requiredFields) ||
      !requiredFields.every((f) => typeof f === 'string') ||
      !Array.isArray(readFields) ||
      !readFields.every((f) => typeof f === 'string') ||
      typeof active !== 'boolean' ||
      !Array.isArray(readerFiles) ||
      !readerFiles.every((f) => typeof f === 'string') ||
      !Array.isArray(unreadFields) ||
      !unreadFields.every((f) => typeof f === 'string') ||
      typeof promotion !== 'string' ||
      !ACTIVE_SURFACE_PROMOTIONS.has(promotion)
    ) {
      throw ValidationError('FactGate', `activeSurfaceFacts.surfaces[${index}] is malformed`);
    }
    return Object.freeze({
      family,
      requiredFields: Object.freeze([...requiredFields]),
      readFields: Object.freeze([...readFields]),
      active,
      readerFiles: Object.freeze([...readerFiles]),
      unreadFields: Object.freeze([...unreadFields]),
      promotion: promotion as ActiveSurfaceFacts['surfaces'][number]['promotion'],
    });
  });
  return Object.freeze({ surfaces: Object.freeze(normalized) });
}

/**
 * A FACT GATE — the "gate-as-data" variant (the FactGate PoC). It replaces the arbitrary
 * {@link Gate.run} closure with two data-shaped halves: a DECLARATION of which host-produced
 * FactPacks it consumes ({@link requires}) and a bounded, context-free {@link decide} over
 * exactly those facts. {@link defineFactGate} synthesizes the {@link Gate.run} +
 * {@link Gate.evidenceDigest} the engine dispatches, so a FactGate is structurally a
 * {@link Gate} (no engine/authority/cache changes) while its AUTHOR surface physically
 * cannot read undeclared evidence — there is no `run(context)` body to smuggle a read in.
 */
export interface FactGate extends Gate {
  readonly form: 'fact';
  readonly requires: readonly FactKind[];
  readonly decide: (facts: FactBundle) => readonly Finding[];
}

/**
 * Define a gate — the one constructor. Validates the spec eagerly (a gate with
 * an empty id, or missing any of red/green/mutation, is a malformed plugin and
 * throws {@link ValidationError} at registration, not at run time).
 */
export function defineGate(spec: Gate): Gate {
  if (spec.id.trim() === '') {
    throw ValidationError('defineGate', 'gate id must be a non-empty string');
  }
  if (typeof spec.run !== 'function') {
    throw ValidationError('defineGate', `gate "${spec.id}" must supply a run function`);
  }
  // A fact gate is the SMUGGLING-FREE form; its discriminant is unforgeable (the module-private
  // `FACT_GATES` WeakSet). A gate built with `defineGate` that hand-sets `form: 'fact'` is a
  // forgery — it would carry an arbitrary context-reading `run` while CLAIMING the data-only
  // contract. Reject it LOUD: a fact gate must be minted by {@link defineFactGate}.
  if (spec.form === 'fact') {
    throw ValidationError(
      'defineGate',
      `gate "${spec.id}" sets form:'fact' but was built with defineGate — a fact gate must be constructed with defineFactGate (the constructor that synthesizes the data-only run + brands the gate). defineGate cannot mint the fact discriminant.`,
    );
  }
  const f = spec.fixtures;
  if (f === undefined || f.red === undefined || f.green === undefined || f.mutation === undefined) {
    throw ValidationError(
      'defineGate',
      `gate "${spec.id}" must ship red + green + mutation fixtures (the authority ratchet) — no fixtures, no blocking authority`,
    );
  }
  if (typeof f.mutation.mutate !== 'function') {
    throw ValidationError('defineGate', `gate "${spec.id}" mutation fixture must supply a mutate(gate) operator`);
  }
  return spec;
}

/**
 * The UNFORGEABLE FactGate membership set — a module-private {@link WeakSet} that ONLY
 * {@link defineFactGate} adds to. {@link isFactGate} checks membership, never the public
 * `form` string and never an on-object brand. A side-table is the only TRUE boundary here:
 * a symbol brand stamped on the gate object is harvestable (`Object.getOwnPropertySymbols`
 * returns it, enumerable or not) and rides an object spread, so a holder of any one fact gate
 * could copy the symbol onto a forgery (or a `{ ...factGate, run: smuggle }` spread would keep
 * it). This WeakSet is never exported, so it cannot be read or written from outside this
 * module; and it is IDENTITY-bound, so a derived/spread object (a different identity) is
 * correctly NOT a fact gate — its `run` was not synthesized here from a context-free `decide`.
 */
const FACT_GATES = new WeakSet<Gate>();

/** The author surface of a {@link FactGate} — context-free by construction (no `run`). */
export interface FactGateSpec {
  readonly id: string;
  readonly level: AssuranceLevel;
  readonly describe: string;
  readonly coverage?: (ir: RepoIR) => readonly FileId[];
  /** The fact channels the decision consumes (≥1). Folded into the cache key. */
  readonly requires: readonly FactKind[];
  /** The bounded, data-only decision — no {@link GateContext} parameter, by design. */
  readonly decide: (facts: FactBundle) => readonly Finding[];
  readonly fixtures: GateFixtures;
}

/**
 * Pick EXACTLY the declared FactPacks off a context into a {@link FactBundle} — the engine
 * seam that hands a {@link FactGate}'s {@link FactGate.decide} only what it declared. A
 * channel the host did not inject arrives as `undefined` (the decision folds it as "absent
 * → nothing to judge"); an UNDECLARED channel is simply never read. This is the physical
 * boundary: `decide` sees this bundle, never the context.
 */
export function pickFacts(context: GateContext, requires: readonly FactKind[]): FactBundle {
  const bundle: { skipSites?: SkipSiteFacts; activeSurfaceFacts?: ActiveSurfaceFacts } = {};
  for (const kind of requires) {
    switch (kind) {
      case 'skipSites':
        bundle.skipSites = normalizeSkipSiteFacts(context.skipSites);
        break;
      case 'activeSurfaceFacts':
        bundle.activeSurfaceFacts = normalizeActiveSurfaceFacts(context.activeSurfaceFacts);
        break;
      default: {
        // Exhaustiveness: adding a FactKind without teaching this pick fails to compile here
        // (the `never` assignment), never silently drops the channel.
        const _exhaustive: never = kind;
        void _exhaustive;
      }
    }
  }
  return bundle;
}

/**
 * The out-of-IR evidence digest for a {@link FactGate} — the cache-soundness keystone,
 * derived from the DECLARED fact channels (not hand-authored). Folds each required
 * channel's content via {@link factAccessEvidenceDigest} (absence-aware: an absent declared
 * fact folds a distinct marker, so a verdict that DEPENDS on absence still re-keys). Changing
 * a FactPack's content — or the sanction registry the producer folds into it — flips the key.
 */
export function factBundleDigest(context: GateContext, requires: readonly FactKind[]): string {
  const perKind = [...requires].sort().map((kind): readonly [string, string] => {
    let fact: unknown;
    switch (kind) {
      case 'skipSites':
        fact = normalizeSkipSiteFacts(context.skipSites);
        break;
      case 'activeSurfaceFacts':
        // Raw fold for cache soundness — normalization strips unknown keys (e.g. the
        // evidence-law perturbation salt) that must still flip the digest.
        fact = context.activeSurfaceFacts;
        break;
      default: {
        // Exhaustiveness: a new FactKind must be folded here, or the build fails — never a
        // silent `undefined` fold (which would key a PRESENT channel as absent: a stale-serve bug).
        const _exhaustive: never = kind;
        void _exhaustive;
        fact = undefined;
      }
    }
    return [kind, factAccessEvidenceDigest(kind, fact)];
  });
  return stableEvidenceDigest(perKind);
}

/**
 * Define a FACT GATE — the gate-as-data constructor. The author supplies a DECLARATION
 * ({@link FactGateSpec.requires}) and a context-free decision ({@link FactGateSpec.decide});
 * this synthesizes the {@link Gate.run} (`decide(pickFacts(context, requires))`) and the
 * {@link Gate.evidenceDigest} ({@link factBundleDigest}) the engine dispatches — so the
 * returned value is a structural {@link Gate} (it runs, caches, and self-proves through the
 * SAME engine path as every closure gate) whose decision physically cannot read undeclared
 * evidence. Validates eagerly, exactly like {@link defineGate}, plus a non-empty `requires`.
 */
export function defineFactGate(spec: FactGateSpec): FactGate {
  if (spec.id.trim() === '') {
    throw ValidationError('defineFactGate', 'gate id must be a non-empty string');
  }
  if (!Array.isArray(spec.requires) || spec.requires.length === 0) {
    throw ValidationError('defineFactGate', `fact gate "${spec.id}" must declare at least one required fact kind`);
  }
  // Each required kind must be a REAL FactKind. A misspelled / `as any`-smuggled channel (e.g.
  // `['skipSite']`) would otherwise brand the gate and silently fold EMPTY facts (the pickFacts /
  // factBundleDigest switch defaults handle the unknown kind as a no-op). Fail LOUD at construction
  // — an undeclared channel is a malformed gate, caught here, not a quiet always-clean verdict.
  const unknownKinds = spec.requires.filter((k) => !(FACT_KINDS as readonly string[]).includes(k));
  if (unknownKinds.length > 0) {
    throw ValidationError(
      'defineFactGate',
      `fact gate "${spec.id}" requires unknown fact kind(s) [${unknownKinds.join(', ')}] — valid kinds: ${FACT_KINDS.join(', ')}`,
    );
  }
  if (typeof spec.decide !== 'function') {
    throw ValidationError('defineFactGate', `fact gate "${spec.id}" must supply a decide(facts) function`);
  }
  const f = spec.fixtures;
  if (f === undefined || f.red === undefined || f.green === undefined || f.mutation === undefined) {
    throw ValidationError(
      'defineFactGate',
      `gate "${spec.id}" must ship red + green + mutation fixtures (the authority ratchet) — no fixtures, no blocking authority`,
    );
  }
  if (typeof f.mutation.mutate !== 'function') {
    throw ValidationError('defineFactGate', `gate "${spec.id}" mutation fixture must supply a mutate(gate) operator`);
  }
  const requires = spec.requires;
  const decide = spec.decide;
  const run = (context: GateContext): readonly Finding[] => decide(pickFacts(context, requires));
  const evidenceDigest = (context: GateContext): string => factBundleDigest(context, requires);
  const gate: FactGate = {
    id: spec.id,
    level: spec.level,
    describe: spec.describe,
    ...(spec.coverage !== undefined ? { coverage: spec.coverage } : {}),
    form: 'fact',
    requires,
    decide,
    run,
    evidenceDigest,
    fixtures: spec.fixtures,
  };
  // FREEZE before branding (codex P1): the WeakSet brands the object IDENTITY, but an unfrozen
  // gate could be mutated IN PLACE — `realFactGate.run = ctx => readSecret(ctx)` keeps the same
  // identity (still a member) while swapping in a context-reading closure. Freezing makes the
  // synthesized `run`/`decide` immutable, so the brand and the data-only decision cannot drift
  // apart. Combined with the identity brand, BOTH attacks are closed: a `{ ...gate, run: x }`
  // spread is a new identity (not a member), and an in-place `gate.run = x` throws (frozen).
  Object.freeze(gate);
  // Record membership in the module-private side-table — the unforgeable, identity-bound brand.
  // Only THIS object (the one whose run was synthesized above from a context-free decide) is a
  // fact gate.
  FACT_GATES.add(gate);
  return gate;
}

/**
 * Narrow a {@link Gate} to the {@link FactGate} variant — by UNFORGEABLE `FACT_GATES`
 * membership, NOT the public `form` string and NOT an on-object brand. A hand-built
 * `{ form: 'fact', run: ctx => readSecret(ctx) }` forgery (which `defineGate` rejects outright,
 * but a raw object could still claim), a symbol harvested off a real fact gate, or a
 * `{ ...factGate, run: smuggle }` spread are all NON-members: only the exact object
 * {@link defineFactGate} minted is in the set. So a caller that trusts `isFactGate` to mean
 * "this gate's decision cannot read undeclared evidence" is not being lied to.
 */
export function isFactGate(gate: Gate): gate is FactGate {
  return FACT_GATES.has(gate);
}

/**
 * Read the injected {@link RepoIR} from a context, or throw a clear tagged
 * {@link HostCapabilityError} when none was injected — the guard an IR-fold gate
 * uses so the lean engine's optional `ir` fails LOUD (never silently no-ops a
 * gate whose whole job is the IR). `gateId` is woven into the error for
 * traceability.
 */
export function requireIR(context: GateContext, gateId: string): RepoIR {
  if (context.ir === undefined) {
    throw HostCapabilityError(
      'repo-IR',
      `gate "${gateId}" requires the injected repo-IR, but none was supplied on the GateContext — a host (the CLI) must build it via @czap/audit's ts.Program and inject it as context.ir`,
    );
  }
  return context.ir;
}

/**
 * Read the injected {@link MutationFacts} from a context, or throw a clear tagged
 * {@link HostCapabilityError} when none was injected — the guard the
 * {@link mutationDivergenceGate} uses so the lean engine's optional `mutation`
 * fails LOUD (never silently no-ops a gate whose whole job is the mutation facts).
 * `gateId` is woven into the error for traceability. The same shape as
 * {@link requireIR}.
 */
export function requireMutation(context: GateContext, gateId: string): MutationFacts {
  if (context.mutation === undefined) {
    throw HostCapabilityError(
      'mutation-facts',
      `gate "${gateId}" requires the injected mutation facts, but none were supplied on the GateContext — a host (the CLI) must generate mutants via @czap/audit's mutation engine, run the covering tests, and inject the decided MutationFacts as context.mutation (the opt-in \`czap check --ir --mutate\` path)`,
    );
  }
  return context.mutation;
}

/**
 * Read the injected {@link McdcFacts} from a context, or throw a clear tagged
 * {@link HostCapabilityError} when none were injected — the guard the
 * {@link mcdcCoverageGate} uses so the lean engine's optional `mcdc` fails LOUD (never
 * silently no-ops a gate whose whole job is the MC/DC facts). `gateId` is woven into the
 * error for traceability. The same shape as {@link requireMutation}.
 */
export function requireMcdc(context: GateContext, gateId: string): McdcFacts {
  if (context.mcdc === undefined) {
    throw HostCapabilityError(
      'mcdc-facts',
      `gate "${gateId}" requires the injected MC/DC facts, but none were supplied on the GateContext — a host (the CLI) must generate the condition-mutants via @czap/audit's condition-mutation engine, run the covering tests per pin, and inject the decided McdcFacts as context.mcdc (the opt-in \`czap check --ir --mcdc\` path)`,
    );
  }
  return context.mcdc;
}

/**
 * Read the injected {@link TaintFacts} from a context, or throw a clear tagged
 * {@link HostCapabilityError} when none were injected — the guard the
 * {@link taintFlowGate} uses so the lean engine's optional `taint` fails LOUD
 * (never silently no-ops a gate whose whole job is the taint dataflow facts).
 * `gateId` is woven into the error for traceability. The same shape as
 * {@link requireMutation} / {@link requireMcdc}.
 */
export function requireTaint(context: GateContext, gateId: string): TaintFacts {
  if (context.taint === undefined) {
    throw HostCapabilityError(
      'taint-facts',
      `gate "${gateId}" requires the injected taint facts, but none were supplied on the GateContext — a host (the CLI) must trace the source→sink dataflow via @czap/audit's taint oracle (classified by the host-injected LiteShip source/sink/sanitizer registry) and inject the decided TaintFacts as context.taint (the opt-in \`czap check --ir --taint\` path)`,
    );
  }
  return context.taint;
}

/**
 * Read the injected {@link CapabilityLinkFacts} from a context, or throw a clear tagged
 * {@link HostCapabilityError} (never silently no-ops the gate whose whole job is the capability-link
 * dataflow proof). The same shape as {@link requireTaint}.
 */
export function requireCapabilityLink(context: GateContext, gateId: string): CapabilityLinkFacts {
  if (context.capabilityLink === undefined) {
    throw HostCapabilityError(
      'capability-link-facts',
      `gate "${gateId}" requires the injected capability-link facts, but none were supplied on the GateContext — a host (the CLI) must resolve each sanctioned skip's guard against the canonical capability symbol table via @czap/audit's capability-link oracle and inject the decided CapabilityLinkFacts as context.capabilityLink (the opt-in \`czap check --ir --capability-gate\` path)`,
    );
  }
  return context.capabilityLink;
}
