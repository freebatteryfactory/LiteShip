[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / GateContext

# Interface: GateContext

Defined in: [gauntlet/src/gate.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L45)

What a gate runs against. Slice A keeps it minimal + extensible; Slice B
widens it with the triangulated repo-IR (LanguageService + AST + module graph
+ receipts + schema). A gate reads ONLY through this context, so the same gate
runs against the real repo and against an in-memory fixture unchanged.

## Properties

### activeSurfaceFacts?

> `readonly` `optional` **activeSurfaceFacts?**: [`ActiveSurfaceFacts`](ActiveSurfaceFacts.md)

Defined in: [gauntlet/src/gate.ts:328](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L328)

Pre-computed ACTIVE-SURFACE field-read evidence — an INJECTED FactPack (#132).
The HOST (`@czap/audit`'s `buildActiveSurfaceFacts`) scans reader paths with
TS-AST and lands flat [ActiveSurfaceFacts](ActiveSurfaceFacts.md); the
[activeModeledSurfaceReaderGate](../variables/activeModeledSurfaceReaderGate.md) decides over them. When ABSENT the gate
folds an empty verdict. See [ActiveSurfaceFacts](ActiveSurfaceFacts.md).

***

### capabilityLink?

> `readonly` `optional` **capabilityLink?**: [`CapabilityLinkFacts`](CapabilityLinkFacts.md)

Defined in: [gauntlet/src/gate.ts:251](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L251)

The host-supplied [CapabilityLinkFacts](CapabilityLinkFacts.md) (codex round-8, #1b) — the dataflow proof that every
sanctioned capability-gated skip's GUARD DERIVES FROM its declared capability's probe. The heavy
`ts.Program`/checker `linker` lives in a HOST (`@czap/audit`'s capability-link oracle, fed the
canonical capability-module SET + the sanctioned sites the `@czap/cli` host injects — the audit
engine names no LiteShip capability, ADR-0012/D7b). The [capabilityGateLinkGate](../variables/capabilityGateLinkGate.md) reads ONLY
through this; fixtures supply a literal facts record. When ABSENT the gate is not in the set
(capability-link is opt-in: `czap check --ir --capability-gate`). A skip whose guard derives from
NO capability probe (`if (Math.random())`) — or the WRONG one (a mislabel) — folds to an L4 finding.

***

### codeOnly?

> `readonly` `optional` **codeOnly?**: (`source`) => `string`

Defined in: [gauntlet/src/gate.ts:99](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L99)

The sound, parser-backed `codeOnly` floor — an INJECTED capability, the same shape as
[skipDetector](#skipdetector). The lean char-state-machine `codeOnly` (gates/code-only.ts) is the
no-typescript FALLBACK; the host (the CLI, which deps `@czap/audit`) builds `codeOnlyAST` (a real
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

Defined in: [gauntlet/src/gate.ts:305](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L305)

Pre-computed COMPOSITION-COVERAGE evidence — an INJECTED capability (the
LOCAL-VS-GLOBAL correctness family — "locally green, globally untested
interaction"), the same lean-engine pattern as [ir](#ir) and [proof](#proof).
OPTIONAL: the heavy work (deriving the interaction edges from the IR call graph,
deciding which units are individually tested, and deciding which edges an
integration test exercises TOGETHER — by a per-test execution-coverage probe or
the sound static-reference proxy) lives in a HOST (the CLI's `czap check --ir
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

Defined in: [gauntlet/src/gate.ts:221](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L221)

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

Defined in: [gauntlet/src/gate.ts:89](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L89)

The SOUND early-return detector — an INJECTED capability. `@czap/gauntlet` carries NO
`typescript` dep; the token `detectEarlyReturnBeforeExpect` is its fallback. The host injects
`detectEarlyReturnBeforeExpectAST` from `@czap/audit`. The no-early-return-test gate calls
`(context.earlyReturnDetector ?? detectEarlyReturnBeforeExpect)(text)`.

#### Parameters

##### source

`string`

#### Returns

readonly [`EarlyReturnMatch`](EarlyReturnMatch.md)[]

***

### fuzzCorpus?

> `readonly` `optional` **fuzzCorpus?**: [`FuzzCorpusFacts`](FuzzCorpusFacts.md)

Defined in: [gauntlet/src/gate.ts:271](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L271)

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

Defined in: [gauntlet/src/gate.ts:110](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L110)

The triangulated repo-IR — an INJECTED capability (Slice B). OPTIONAL by
design: `@czap/gauntlet` is the lean engine and the IR is built+injected by
a host (the CLI, via `@czap/audit`'s `ts.Program`), so the gauntlet never
carries the heavy `typescript` dep. An existing regex gate ignores it
entirely; a new IR-fold gate that REQUIRES it must guard `ir === undefined`
(or use [requireIR](../functions/requireIR.md), which throws a clear tagged error when no IR was
injected). In-memory fixtures and the filesystem context leave it `undefined`
until a host supplies one. See [RepoIR](RepoIR.md).

***

### mcdc?

> `readonly` `optional` **mcdc?**: [`McdcFacts`](McdcFacts.md)

Defined in: [gauntlet/src/gate.ts:151](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L151)

Pre-computed MC/DC (Modified Condition/Decision Coverage) evidence — an INJECTED
capability (the avionics tier — DO-178B Level A's coverage requirement, realized as
CONDITION-LEVEL MUTATION), the same lean-engine pattern as [mutation](#mutation).
OPTIONAL: the heavy work (decomposing every L4 decision into its atomic conditions,
minting the force-true/force-false pin per condition, running the covering tests per
pin) all lives in a HOST (`@czap/audit`'s condition-mutation engine + the CLI's
per-mutant vitest runner), which folds the two pins per condition into flat
[McdcFacts](McdcFacts.md) (each condition MC/DC-covered iff BOTH pins were KILLED) and lands
them here. The [mcdcCoverageGate](../variables/mcdcCoverageGate.md) reads ONLY through this; in-memory fixtures
supply a literal facts record (no parse, no test run). When ABSENT the gate is simply
not in the set (MC/DC is opt-in: `czap check --ir --mcdc`), so there is no per-pin
cost and no noise on a default run. See [McdcFacts](McdcFacts.md).

***

### mutation?

> `readonly` `optional` **mutation?**: [`MutationFacts`](MutationFacts.md)

Defined in: [gauntlet/src/gate.ts:136](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L136)

Pre-computed mutation evidence — an INJECTED capability (Slice C, the avionics
tier — mutation-as-divergence), the same lean-engine pattern as [ir](#ir) and
[supplyChain](#supplychain). OPTIONAL: the heavy AST mutation + the per-mutant vitest
runs all live in a HOST (`@czap/audit`'s mutation engine + the CLI's vitest
runner), which folds them into flat [MutationFacts](MutationFacts.md) (every mutant's
kill/survive verdict + the committed score baseline) and lands them here. The
[mutationDivergenceGate](../variables/mutationDivergenceGate.md) reads ONLY through this; in-memory fixtures
supply a literal facts record (no parse, no test run). When ABSENT the gate is
simply not in the set (mutation is opt-in: `czap check --ir --mutate`), so
there is no per-mutant cost and no noise on a default run. See
[MutationFacts](MutationFacts.md).

***

### proof?

> `readonly` `optional` **proof?**: [`ProofFacts`](ProofFacts.md)

Defined in: [gauntlet/src/gate.ts:288](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L288)

Pre-computed PROOF-STRENGTH evidence — an INJECTED capability (the
LOCAL-VS-GLOBAL correctness family — the lax-functor: local proof ≤ weakest
dependency), the same lean-engine pattern as [ir](#ir), [mutation](#mutation), and
[simulation](#simulation). OPTIONAL: the heavy work (reading the proof signals —
mutation-score baseline, coverage report, property-test presence, the enrolled
invariants ledger — and blending them into a per-module proof scalar) lives in a
HOST (the CLI's `czap check --ir --proof` path), which folds them into flat
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

Defined in: [gauntlet/src/gate.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L47)

Absolute root the gate's paths resolve against.

***

### simulation?

> `readonly` `optional` **simulation?**: [`SimulationFacts`](SimulationFacts.md)

Defined in: [gauntlet/src/gate.ts:167](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L167)

Pre-computed DETERMINISTIC-SIMULATION (DST) evidence — an INJECTED capability
(Slice C, the avionics tier), the same lean-engine pattern as [ir](#ir),
[supplyChain](#supplychain), and [mutation](#mutation). OPTIONAL: the heavy work (minting a
seeded world, running the scenario corpus, replaying each seed twice, and
content-addressing the byte-exact traces) all lives in a HOST (the CLI's
`czap check --ir --simulate` path, driving the `@czap/core/simulation`
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

Defined in: [gauntlet/src/gate.ts:82](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L82)

The SOUND skip detector — an INJECTED capability (the AST detector, the cure that ends the
token-scanner whack-a-mole). OPTIONAL by design, the SAME lean-engine pattern as [ir](#ir):
`@czap/gauntlet` carries NO `typescript` dep, so the dependency-free token `detectSkips` is its
FALLBACK; the host (the CLI, which deps `@czap/audit`) builds `detectSkipsAST` (a real
`ts.createSourceFile` AST walk + local binding analysis + conditionality classification) and
injects it here. A skip-reading gate / scan calls `(context.skipDetector ?? detectSkips)(text)`
— the AST detector when injected (line-agnostic, catches every multi-line/ASI/inner-describe
spelling, and produces the `conditional` F2 discriminant), the token fallback otherwise. When
ABSENT the token detector runs unchanged (back-compat; the lean `czap check` path). See
[SkipMatch](SkipMatch.md).

#### Parameters

##### source

`string`

#### Returns

readonly [`SkipMatch`](SkipMatch.md)[]

***

### skipSites?

> `readonly` `optional` **skipSites?**: [`SkipSiteFacts`](SkipSiteFacts.md)

Defined in: [gauntlet/src/gate.ts:320](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L320)

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

### standards?

> `readonly` `optional` **standards?**: [`StandardsIntegrityFacts`](StandardsIntegrityFacts.md)

Defined in: [gauntlet/src/gate.ts:201](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L201)

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

Defined in: [gauntlet/src/gate.ts:122](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L122)

Pre-computed supply-chain evidence — an INJECTED capability (Slice C, the
avionics tier), the same lean-engine pattern as [ir](#ir). OPTIONAL: the
heavy lockfile parse / SBOM build / ShipCapsule decode / CI scan all live in
a HOST (the CLI's `@czap/cli` supply-chain analyzer), which folds them into
flat [SupplyChainFacts](SupplyChainFacts.md) and lands them here. The
[supplyChainGate](../variables/supplyChainGate.md) reads ONLY through this; in-memory fixtures supply a
literal facts record (no I/O, no YAML). When ABSENT the supply-chain gate
reports an honest advisory "not-evidenced" finding rather than a silent
green. See [SupplyChainFacts](SupplyChainFacts.md).

***

### taint?

> `readonly` `optional` **taint?**: [`TaintFacts`](TaintFacts.md)

Defined in: [gauntlet/src/gate.ts:240](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L240)

Pre-computed TAINT-DATAFLOW evidence — an INJECTED capability (the
TAINT-ANALYSIS family), the same lean-engine pattern as [ir](#ir),
[supplyChain](#supplychain), [mutation](#mutation), [simulation](#simulation), [traceability](#traceability),
and [standards](#standards). OPTIONAL: the heavy work (a whole-corpus `ts.Program` +
a type-checker dataflow trace from each untrusted SOURCE call to each dangerous
SINK call argument, observing the SANITIZER on the path) lives in a HOST
(`@czap/audit`'s taint oracle, classified by the LiteShip-LOCAL source/sink/
sanitizer registry the `@czap/cli` host injects — the audit engine itself
references NO LiteShip policy, ADR-0012/D7b), which folds the traced flows into
flat [TaintFacts](TaintFacts.md) (every source→sink flow + its sanitizer, if any + the
honest interprocedural depth the trace covered) and lands them here. The
[taintFlowGate](../variables/taintFlowGate.md) reads ONLY through this; in-memory fixtures supply a
literal facts record (no program, no checker). When ABSENT the gate is simply
not in the set (taint is opt-in: `czap check --ir --taint`). An UNSANITIZED
source→sink flow folds to a Finding at the sink's (propagated) level — L4 for a
trust-spine sink. See [TaintFacts](TaintFacts.md).

***

### traceability?

> `readonly` `optional` **traceability?**: [`TraceabilityFacts`](TraceabilityFacts.md)

Defined in: [gauntlet/src/gate.ts:183](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L183)

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

## Methods

### allFiles()?

> `optional` **allFiles**(): readonly `string`[]

Defined in: [gauntlet/src/gate.ts:69](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L69)

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

Defined in: [gauntlet/src/gate.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L51)

Repo-relative paths the gate may consider (already filtered to its scope).

#### Returns

readonly `string`[]

***

### readFile()

> **readFile**(`relativePath`): `string` \| `undefined`

Defined in: [gauntlet/src/gate.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L49)

Read a repo-relative file's text, or `undefined` if absent.

#### Parameters

##### relativePath

`string`

#### Returns

`string` \| `undefined`
