[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / GateContext

# Interface: GateContext

Defined in: [gauntlet/src/gate.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L48)

What a gate runs against. Slice A keeps it minimal + extensible; Slice B
widens it with the triangulated repo-IR (LanguageService + AST + module graph
+ receipts + schema). A gate reads ONLY through this context, so the same gate
runs against the real repo and against an in-memory fixture unchanged.

## Properties

### activeSurfaceFacts?

> `readonly` `optional` **activeSurfaceFacts?**: [`ActiveSurfaceFacts`](ActiveSurfaceFacts.md)

Defined in: [gauntlet/src/gate.ts:363](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L363)

Pre-computed ACTIVE-SURFACE field-read evidence — an INJECTED FactPack (#132).
The HOST (`@liteship/audit`'s `buildActiveSurfaceFacts`) scans reader paths with
TS-AST and lands flat [ActiveSurfaceFacts](ActiveSurfaceFacts.md); the
[activeModeledSurfaceReaderGate](../variables/activeModeledSurfaceReaderGate.md) decides over them. When ABSENT the gate
folds an empty verdict. See [ActiveSurfaceFacts](ActiveSurfaceFacts.md).

***

### capabilityLink?

> `readonly` `optional` **capabilityLink?**: [`CapabilityLinkFacts`](CapabilityLinkFacts.md)

Defined in: [gauntlet/src/gate.ts:286](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L286)

The host-supplied [CapabilityLinkFacts](CapabilityLinkFacts.md) (codex round-8, #1b) — the dataflow proof that every
sanctioned capability-gated skip's GUARD DERIVES FROM its declared capability's probe. The heavy
`ts.Program`/checker `linker` lives in a HOST (`@liteship/audit`'s capability-link oracle, fed the
canonical capability-module SET + the sanctioned sites the `@liteship/cli` host injects — the audit
engine names no LiteShip capability, ADR-0012/D7b). The [capabilityGateLinkGate](../variables/capabilityGateLinkGate.md) reads ONLY
through this; fixtures supply a literal facts record. When ABSENT the gate is not in the set
(capability-link is opt-in: `liteship check --ir --capability-gate`). A skip whose guard derives from
NO capability probe (`if (Math.random())`) — or the WRONG one (a mislabel) — folds to an L4 finding.

***

### checkGovernance?

> `readonly` `optional` **checkGovernance?**: [`CheckGovernanceFacts`](CheckGovernanceFacts.md)

Defined in: [gauntlet/src/gate.ts:375](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L375)

Pre-computed CHECK-GOVERNANCE evidence — an INJECTED FactPack the three
check-governance meta-gates (`check-registry-complete` / `check-negative-control` /
`check-waiver-freshness`) decide over. The HOST (the `tests/unit/devops` meta-test,
or a future CLI host) reads `@liteship/command`'s `CHECK_REGISTRY` / `SCRIPT_EXEMPTIONS`
/ `package.json` / the filesystem / `LITESHIP_WAIVERS` / the traceability ledger
against an injected wall-clock date and folds the decided [CheckGovernanceFacts](CheckGovernanceFacts.md)
— the gauntlet never imports `@liteship/command` (the dependency arrow points the other
way) nor reads a clock. When ABSENT (the lean production path) every meta-gate folds an
empty verdict. See [CheckGovernanceFacts](CheckGovernanceFacts.md).

***

### codeOnly?

> `readonly` `optional` **codeOnly?**: (`source`) => `string`

Defined in: [gauntlet/src/gate.ts:102](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L102)

The sound, parser-backed `codeOnly` floor — an INJECTED capability, the same shape as
[skipDetector](#skipdetector). The lean char-state-machine `codeOnly` (gates/code-only.ts) is the
no-typescript FALLBACK; the host (the CLI, which deps `@liteship/audit`) builds `codeOnlyAST` (a real
`ts.createSourceFile` token walk that the parser disambiguates — regex-vs-division, nested
templates, comments) and injects it here. A code-scanning gate calls `(context.codeOnly ?? codeOnly)(text)`
— the scanner when injected, the char-machine otherwise. The two are pinned equivalent by the
differential test (tests/unit/audit/code-ranges.test.ts), so the fallback stays faithful.

#### Parameters

##### source

`string`

#### Returns

`string`

***

### composition?

> `readonly` `optional` **composition?**: [`CompositionFacts`](CompositionFacts.md)

Defined in: [gauntlet/src/gate.ts:340](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L340)

Pre-computed COMPOSITION-COVERAGE evidence — an INJECTED capability (the
LOCAL-VS-GLOBAL correctness family — "locally green, globally untested
interaction"), the same lean-engine pattern as [ir](#ir) and [proof](#proof).
OPTIONAL: the heavy work (deriving the interaction edges from the IR call graph,
deciding which units are individually tested, and deciding which edges an
integration test exercises TOGETHER — by a per-test execution-coverage probe or
the sound static-reference proxy) lives in a HOST (the CLI's `liteship check --ir
--composition` path), which folds the classified edges into flat
[CompositionFacts](CompositionFacts.md) and lands them here. The [compositionCoverageGate](../variables/compositionCoverageGate.md)
reads ONLY through this; in-memory fixtures supply a literal facts record (no
call graph, no probe). When ABSENT the gate reports an honest advisory
"not-evidenced" finding rather than a silent green. An UNCOVERED L4 interaction
edge folds to a Finding at the edge's (propagated) level. See
[CompositionFacts](CompositionFacts.md).

***

### declaredFix?

> `readonly` `optional` **declaredFix?**: [`DeclaredFixFacts`](DeclaredFixFacts.md)

Defined in: [gauntlet/src/gate.ts:256](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L256)

Pre-computed DECLARED-FIX evidence — an INJECTED capability (the AGENT-SAFETY
META-GAUNTLET, the "raccoon rule", phases B+C — the agent-fix admission control),
the same lean-engine pattern as [standards](#standards). OPTIONAL by design: it is
present ONLY when an agent's AUTO-FIX is being validated (the `--fix` / apply
path). The heavy work (measuring the actual change off the working tree, reading
the live standards surface BEFORE + AFTER the fix, content-addressing each via the
ONE `contentAddressOf` kernel, then running `verifyDeclaredFix` against the
declaration) all lives in a HOST (the CLI's agent-fix admission entry point); it
folds the decided [DeclaredFixFacts](DeclaredFixFacts.md) (the verifier's verdict + the declared
intent) and lands them here. The [declaredFixProtocolGate](../variables/declaredFixProtocolGate.md) reads ONLY through
this; in-memory fixtures supply a literal facts record (no fs, no clock, no
addressing). When ABSENT (a normal commit, NOT an agent-fix) the gate is SILENT —
phase A's commit backstop ([standards](#standards)) already guards that path. A REJECTED
fix (scope-creep / size-exceeded / unsigned or forbidden weakening / forged
receipt) folds to a BLOCKING L4 Finding per reason — the raccoon caught on the
apply path. The SAME `verifyDeclaredFix` runs at the apply moment (phase B) and
here at the commit gate (phase C) — one engine. See [DeclaredFixFacts](DeclaredFixFacts.md).

***

### earlyReturnDetector?

> `readonly` `optional` **earlyReturnDetector?**: (`source`) => readonly [`EarlyReturnMatch`](EarlyReturnMatch.md)[]

Defined in: [gauntlet/src/gate.ts:92](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L92)

The SOUND early-return detector — an INJECTED capability. `@liteship/gauntlet` carries NO
`typescript` dep; the token `detectEarlyReturnBeforeExpect` is its fallback. The host injects
`detectEarlyReturnBeforeExpectAST` from `@liteship/audit`. The no-early-return-test gate calls
`(context.earlyReturnDetector ?? detectEarlyReturnBeforeExpect)(text)`.

#### Parameters

##### source

`string`

#### Returns

readonly [`EarlyReturnMatch`](EarlyReturnMatch.md)[]

***

### fuzzCorpus?

> `readonly` `optional` **fuzzCorpus?**: [`FuzzCorpusFacts`](FuzzCorpusFacts.md)

Defined in: [gauntlet/src/gate.ts:306](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L306)

Pre-computed DECODE-FUZZ evidence — an INJECTED capability (the
UNTRUSTED-BYTE DECODE-SURFACE hardening), the same lean-engine pattern as
[ir](#ir), [supplyChain](#supplychain), [mutation](#mutation), [simulation](#simulation),
[traceability](#traceability), [standards](#standards), and [taint](#taint). OPTIONAL: the heavy
work (hammering every L4 decoder — canonical-CBOR / HLC / GraphPatch /
DocumentGraph / ShipCapsule — with the committed `tests/fixtures/fuzz-corpus`
seeds + a fixed, seeded count of `fast-check` generated inputs, classifying
each outcome as fail-closed-or-typed vs a crash / a prototype-pollution / a
misparse) lives in a HOST (the `tests/fuzz` decode fuzzer, driven by the CLI
fuzz path), which folds the per-decoder verdicts into flat
[FuzzCorpusFacts](FuzzCorpusFacts.md) and lands them here. The [fuzzCorpusGate](../variables/fuzzCorpusGate.md) reads
ONLY through this; in-memory fixtures supply a literal facts record (no
`fast-check`, no corpus, no decoder). When ABSENT the gate reports an honest
advisory "not-evidenced" finding rather than a silent green. A violation fact
carries its REPRODUCER (a corpus seed id or a `generated@seed=0x…` source), so
the decode crash/pollution it folds replays byte-for-byte. See
[FuzzCorpusFacts](FuzzCorpusFacts.md).

***

### ir?

> `readonly` `optional` **ir?**: [`RepoIR`](RepoIR.md)

Defined in: [gauntlet/src/gate.ts:113](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L113)

The triangulated repo-IR — an INJECTED capability (Slice B). OPTIONAL by
design: `@liteship/gauntlet` is the lean engine and the IR is built+injected by
a host (the CLI, via `@liteship/audit`'s `ts.Program`), so the gauntlet never
carries the heavy `typescript` dep. An existing regex gate ignores it
entirely; a new IR-fold gate that REQUIRES it must guard `ir === undefined`
(or use [requireIR](../functions/requireIR.md), which throws a clear tagged error when no IR was
injected). In-memory fixtures and the filesystem context leave it `undefined`
until a host supplies one. See [RepoIR](RepoIR.md).

***

### mcdc?

> `readonly` `optional` **mcdc?**: [`McdcFacts`](McdcFacts.md)

Defined in: [gauntlet/src/gate.ts:186](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L186)

Pre-computed MC/DC (Modified Condition/Decision Coverage) evidence — an INJECTED
capability (the avionics tier — DO-178B Level A's coverage requirement, realized as
CONDITION-LEVEL MUTATION), the same lean-engine pattern as [mutation](#mutation).
OPTIONAL: the heavy work (decomposing every L4 decision into its atomic conditions,
minting the force-true/force-false pin per condition, running the covering tests per
pin) all lives in a HOST (`@liteship/audit`'s condition-mutation engine + the CLI's
per-mutant vitest runner), which folds the two pins per condition into flat
[McdcFacts](McdcFacts.md) (each condition MC/DC-covered iff BOTH pins were KILLED) and lands
them here. The [mcdcCoverageGate](../variables/mcdcCoverageGate.md) reads ONLY through this; in-memory fixtures
supply a literal facts record (no parse, no test run). When ABSENT the gate is simply
not in the set (MC/DC is opt-in: `liteship check --ir --mcdc`), so there is no per-pin
cost and no noise on a default run. See [McdcFacts](McdcFacts.md).

***

### mutation?

> `readonly` `optional` **mutation?**: [`MutationFacts`](MutationFacts.md)

Defined in: [gauntlet/src/gate.ts:139](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L139)

Pre-computed mutation evidence — an INJECTED capability (Slice C, the avionics
tier — mutation-as-divergence), the same lean-engine pattern as [ir](#ir) and
[supplyChain](#supplychain). OPTIONAL: the heavy AST mutation + the per-mutant vitest
runs all live in a HOST (`@liteship/audit`'s mutation engine + the CLI's vitest
runner), which folds them into flat [MutationFacts](MutationFacts.md) (every mutant's
kill/survive verdict + the committed score baseline) and lands them here. The
[mutationDivergenceGate](../variables/mutationDivergenceGate.md) reads ONLY through this; in-memory fixtures
supply a literal facts record (no parse, no test run). When ABSENT the gate is
simply not in the set (mutation is opt-in: `liteship check --ir --mutate`), so
there is no per-mutant cost and no noise on a default run. See
[MutationFacts](MutationFacts.md).

***

### proof?

> `readonly` `optional` **proof?**: [`ProofFacts`](ProofFacts.md)

Defined in: [gauntlet/src/gate.ts:323](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L323)

Pre-computed PROOF-STRENGTH evidence — an INJECTED capability (the
LOCAL-VS-GLOBAL correctness family — the lax-functor: local proof ≤ weakest
dependency), the same lean-engine pattern as [ir](#ir), [mutation](#mutation), and
[simulation](#simulation). OPTIONAL: the heavy work (reading the proof signals —
mutation-score baseline, coverage report, property-test presence, the enrolled
invariants ledger — and blending them into a per-module proof scalar) lives in a
HOST (the CLI's `liteship check --ir --proof` path), which folds them into flat
[ProofFacts](ProofFacts.md) and lands them here. The [proofPropagationGate](../variables/proofPropagationGate.md)
PROPAGATES the scalar along the IR's dep DAG (the `min`-fixpoint dual of
assurance propagation) and reads ONLY through this; in-memory fixtures supply a
literal facts record (no report, no ledger). When ABSENT the gate reports an
honest advisory "not-evidenced" finding rather than a silent green. A trust-spine
module whose GLOBAL proof drops below a floor BECAUSE of a weak dependency folds
to a Finding naming the weak-link path. See [ProofFacts](ProofFacts.md).

***

### repoRoot

> `readonly` **repoRoot**: `string`

Defined in: [gauntlet/src/gate.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L50)

Absolute root the gate's paths resolve against.

***

### simulation?

> `readonly` `optional` **simulation?**: [`SimulationFacts`](SimulationFacts.md)

Defined in: [gauntlet/src/gate.ts:202](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L202)

Pre-computed DETERMINISTIC-SIMULATION (DST) evidence — an INJECTED capability
(Slice C, the avionics tier), the same lean-engine pattern as [ir](#ir),
[supplyChain](#supplychain), and [mutation](#mutation). OPTIONAL: the heavy work (minting a
seeded world, running the scenario corpus, replaying each seed twice, and
content-addressing the byte-exact traces) all lives in a HOST (the CLI's
`liteship check --ir --simulate` path, driving the `@liteship/core/simulation`
harness), which folds the verdicts into flat [SimulationFacts](SimulationFacts.md) (every
scenario's two replay digests + any divergence) and lands them here. The
[simulationDeterminismGate](../variables/simulationDeterminismGate.md) reads ONLY through this; in-memory fixtures
supply a literal facts record (no world, no replay). When ABSENT the gate
reports an honest advisory "not-evidenced" finding rather than a silent green.
A replay-divergence fact carries its SEED, so the bug it folds replays
byte-for-byte. See [SimulationFacts](SimulationFacts.md).

***

### skipDetector?

> `readonly` `optional` **skipDetector?**: (`source`) => readonly [`SkipMatch`](SkipMatch.md)[]

Defined in: [gauntlet/src/gate.ts:85](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L85)

The SOUND skip detector — an INJECTED capability (the AST detector, the cure that ends the
token-scanner whack-a-mole). OPTIONAL by design, the SAME lean-engine pattern as [ir](#ir):
`@liteship/gauntlet` carries NO `typescript` dep, so the dependency-free token `detectSkips` is its
FALLBACK; the host (the CLI, which deps `@liteship/audit`) builds `detectSkipsAST` (a real
`ts.createSourceFile` AST walk + local binding analysis + conditionality classification) and
injects it here. A skip-reading gate / scan calls `(context.skipDetector ?? detectSkips)(text)`
— the AST detector when injected (line-agnostic, catches every multi-line/ASI/inner-describe
spelling, and produces the `conditional` F2 discriminant), the token fallback otherwise. When
ABSENT the token detector runs unchanged (back-compat; the lean `liteship check` path). See
[SkipMatch](SkipMatch.md).

#### Parameters

##### source

`string`

#### Returns

readonly [`SkipMatch`](SkipMatch.md)[]

***

### skipSites?

> `readonly` `optional` **skipSites?**: [`SkipSiteFacts`](SkipSiteFacts.md)

Defined in: [gauntlet/src/gate.ts:355](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L355)

Pre-computed SKIP-SITE evidence — an INJECTED FactPack (the FactGate PoC, the
"gate-as-data" ratchet). The PRODUCER (the O(n) repo scan: enumerate the governed
corpus, read each file, run the skip detector, and precompute each site's three
orthogonal floor inputs — `carriesPlaceholder` / `sanctionMatched` /
`capabilityConsistent`) is a HOST-side fold ([produceSkipSiteFactsFromContext](../functions/produceSkipSiteFactsFromContext.md),
wrapping the injected `detectSkipsAST` when present, the token `detectSkips`
otherwise). The [noSkippedTestFactGate](../variables/noSkippedTestFactGate.md)'s per-site decision KERNEL reads ONLY
this — never the file system — so the author surface (`decide(facts)`) physically
cannot read undeclared evidence (the structural cure the closure-shaped
[noSkippedTestGate](../variables/noSkippedTestGate.md) could not give: there is no `run(context)` body to hide a
read in). When ABSENT the fact gate folds an empty verdict (no facts, nothing judged);
the original closure gate is unaffected. See [SkipSiteFacts](SkipSiteFacts.md).

***

### spineRelation?

> `readonly` `optional` **spineRelation?**: [`SpineRelationFacts`](SpineRelationFacts.md)

Defined in: [gauntlet/src/gate.ts:171](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L171)

Pre-computed TWO-AXIS spine-relation classification — an INJECTED capability (the
constitution's static-projection half, Wave 8.5), the same lean-engine pattern as
[transition](#transition). OPTIONAL: the heavy work (a `ts.Program` per build, one
bidirectional-assignability probe per admitted mirror type) runs in `@liteship/audit`'s
`buildSpineRelationFacts`; when the host did not run it this capability is ABSENT and
the [spineRelationGate](../variables/spineRelationGate.md) is simply not in the set (no cost, no noise). Each
observation carries its two axes so a drift finding names WHICH relation changed.
See [SpineRelationFacts](SpineRelationFacts.md).

***

### standards?

> `readonly` `optional` **standards?**: [`StandardsIntegrityFacts`](StandardsIntegrityFacts.md)

Defined in: [gauntlet/src/gate.ts:236](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L236)

Pre-computed STANDARDS-INTEGRITY evidence — an INJECTED capability (the
AGENT-SAFETY META-GAUNTLET, the "raccoon rule"), the same lean-engine pattern as
[ir](#ir), [supplyChain](#supplychain), [mutation](#mutation), [simulation](#simulation), and
[traceability](#traceability). OPTIONAL: the heavy work (reading the live standards surface
off the gauntlet's own exports + the committed `benchmarks/`/`traceability/`
artifacts, content-addressing the surface via the ONE `contentAddressOf` kernel,
diffing it against the committed snapshot, applying the owner sign-offs against the
injected wall-clock date) all lives in a HOST (the CLI's
`packages/cli/src/lib/standards-surface.ts` extractor), which folds the decided
verdicts into flat [StandardsIntegrityFacts](StandardsIntegrityFacts.md) (the unsigned/signed/forbidden/
expired weakenings + the stale strengthens) and lands them here. The
[standardsIntegrityGate](../variables/standardsIntegrityGate.md) reads ONLY through this; in-memory fixtures supply a
literal facts record (no fs, no clock, no addressing). When ABSENT the gate is
simply not exercised. An UNSIGNED weakening folds to a BLOCKING L4 Finding — the
raccoon caught. See [StandardsIntegrityFacts](StandardsIntegrityFacts.md).

***

### supplyChain?

> `readonly` `optional` **supplyChain?**: [`SupplyChainFacts`](SupplyChainFacts.md)

Defined in: [gauntlet/src/gate.ts:125](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L125)

Pre-computed supply-chain evidence — an INJECTED capability (Slice C, the
avionics tier), the same lean-engine pattern as [ir](#ir). OPTIONAL: the
heavy lockfile parse / SBOM build / ShipCapsule decode / CI scan all live in
a HOST (the CLI's `@liteship/cli` supply-chain analyzer), which folds them into
flat [SupplyChainFacts](SupplyChainFacts.md) and lands them here. The
[supplyChainGate](../variables/supplyChainGate.md) reads ONLY through this; in-memory fixtures supply a
literal facts record (no I/O, no YAML). When ABSENT the supply-chain gate
reports an honest advisory "not-evidenced" finding rather than a silent
green. See [SupplyChainFacts](SupplyChainFacts.md).

***

### taint?

> `readonly` `optional` **taint?**: [`TaintFacts`](TaintFacts.md)

Defined in: [gauntlet/src/gate.ts:275](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L275)

Pre-computed TAINT-DATAFLOW evidence — an INJECTED capability (the
TAINT-ANALYSIS family), the same lean-engine pattern as [ir](#ir),
[supplyChain](#supplychain), [mutation](#mutation), [simulation](#simulation), [traceability](#traceability),
and [standards](#standards). OPTIONAL: the heavy work (a whole-corpus `ts.Program` +
a type-checker dataflow trace from each untrusted SOURCE call to each dangerous
SINK call argument, observing the SANITIZER on the path) lives in a HOST
(`@liteship/audit`'s taint oracle, classified by the LiteShip-LOCAL source/sink/
sanitizer registry the `@liteship/cli` host injects — the audit engine itself
references NO LiteShip policy, ADR-0012/D7b), which folds the traced flows into
flat [TaintFacts](TaintFacts.md) (every source→sink flow + its sanitizer, if any + the
honest interprocedural depth the trace covered) and lands them here. The
[taintFlowGate](../variables/taintFlowGate.md) reads ONLY through this; in-memory fixtures supply a
literal facts record (no program, no checker). When ABSENT the gate is simply
not in the set (taint is opt-in: `liteship check --ir --taint`). An UNSANITIZED
source→sink flow folds to a Finding at the sink's (propagated) level — L4 for a
trust-spine sink. See [TaintFacts](TaintFacts.md).

***

### traceability?

> `readonly` `optional` **traceability?**: [`TraceabilityFacts`](TraceabilityFacts.md)

Defined in: [gauntlet/src/gate.ts:218](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L218)

Pre-computed REQUIREMENTS-TRACEABILITY evidence — an INJECTED capability (the
avionics-tier ledger, DO-178B-style), the same lean-engine pattern as [ir](#ir),
[supplyChain](#supplychain), [mutation](#mutation), and [simulation](#simulation). OPTIONAL: the heavy
work (parsing `traceability/*.yaml`, scanning the test corpus for `// PROVES:`
headers, running the lifecycle state machine against the injected wall-clock date,
content-addressing the resolved ledger) all lives in a HOST (the CLI's
`packages/cli/src/lib/traceability.ts` state machine), which folds the verdicts
into flat [TraceabilityFacts](TraceabilityFacts.md) (every invariant's resolved state + any
ledger⇔header divergence + the resolved-ledger content address) and lands them
here. The [traceabilityBridgeGate](../variables/traceabilityBridgeGate.md) reads ONLY through this; in-memory
fixtures supply a literal facts record (no YAML, no clock). When ABSENT the gate
is simply not in the set. An UNTRACED invariant or an EXPIRED waiver folds to a
self-explaining Finding at the invariant's level. See [TraceabilityFacts](TraceabilityFacts.md).

***

### transition?

> `readonly` `optional` **transition?**: [`TransitionFacts`](TransitionFacts.md)

Defined in: [gauntlet/src/gate.ts:160](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L160)

Pre-computed TRANSITION-CONFORMANCE (bisimulation) evidence — an INJECTED
capability (Wave 5.5, the transition cage — the DYNAMIC-SUBJECT half of the
conformance backbone), the same lean-engine pattern as [ir](#ir) and
[mutation](#mutation). OPTIONAL: the heavy work (unfolding each seeded op history over
BOTH the single-oracle model AND the live implementation over the native transport,
content-addressing each observed trace, deciding the per-case bisimulation verdict)
all lives in a HOST (`@liteship/audit`'s `buildTransitionFacts` + the LiteShip-local
reactive capture/model runner `tests/support/reactive-conformance.ts`), which folds the
verdicts into flat [TransitionFacts](TransitionFacts.md) (every case's model/impl observation digests +
status + the committed unevidenced baseline) and lands them here. The
[transitionConformanceGate](../variables/transitionConformanceGate.md) reads ONLY through this; in-memory fixtures supply
a literal facts record (no primitive, no capture). When ABSENT the gate is simply not in
the set. The reactive model + native-transport oracle are LiteShip-local (product
machinery in the test tree), so — per ADR-0012/0023 — the gate is HOSTED by the repo-local
`transition:gate` phase (`scripts/transition-conformance-gate.ts`, run every PR), NOT the
shipped `liteship check` CLI, so there is no per-case cost and no noise on a default run. A
`divergent` case carries its SEED, so the behavior change it folds replays
byte-for-byte. See [TransitionFacts](TransitionFacts.md).

## Methods

### allFiles()?

> `optional` **allFiles**(): readonly `string`[]

Defined in: [gauntlet/src/gate.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L72)

The UNSCOPED repo-relative file list — every path the context globs, BEFORE
level-scoping narrows [files](#files) to a gate's band. OPTIONAL (a context that
predates this accessor omits it; a reader falls back to [files](#files)).

Why this exists: [files](#files) is level-SCOPED (a gate at L3 only sees files at
L3+). That is correct for the JUDGED surface — a gate should only flag findings in
its band. But a CONFIRMER-reading gate (the claim-vs-reality family) needs the
test corpus as EVIDENCE, and the test corpus sits BELOW the gate's level (tests are
not L3 source). Scoping the evidence away makes every claim read as unconfirmed — a
false finding born of scope (the honesty bug that made the claim-property gate flag
1000+ untested claims in production while its own test, globbing the full corpus,
stayed green). `allFiles` is the unscoped evidence corpus, preserved verbatim
through [scopeContextByLevel](../functions/scopeContextByLevel.md) exactly as [readFile](#readfile) is — so a confirmer
gate reads the SAME corpus in production as in its self-test. The JUDGED surface is
still `files()` (scoped); only the confirmer EVIDENCE reads `allFiles()`.

#### Returns

readonly `string`[]

***

### files()

> **files**(): readonly `string`[]

Defined in: [gauntlet/src/gate.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L54)

Repo-relative paths the gate may consider (already filtered to its scope).

#### Returns

readonly `string`[]

***

### readFile()

> **readFile**(`relativePath`): `string` \| `undefined`

Defined in: [gauntlet/src/gate.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L52)

Read a repo-relative file's text, or `undefined` if absent.

#### Parameters

##### relativePath

`string`

#### Returns

`string` \| `undefined`
