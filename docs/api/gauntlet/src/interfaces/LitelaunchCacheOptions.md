[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / LitelaunchCacheOptions

# Interface: LitelaunchCacheOptions

Defined in: [gauntlet/src/runner.ts:672](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L672)

The INJECTED verdict-cache options the host threads into
[litelaunchGauntletWithIR](../functions/litelaunchGauntletWithIR.md) (Slice B, B2). All optional — omit them and the
run is a full, uncached run (back-compat). The [GateVerdictCache](GateVerdictCache.md) store
and the `toolchainDigest` are HOST-built (the CLI owns `fs` + crypto); the lean
engine only consumes them.

## Properties

### activeSurfaceFacts?

> `readonly` `optional` **activeSurfaceFacts?**: [`ActiveSurfaceFacts`](ActiveSurfaceFacts.md)

Defined in: [gauntlet/src/runner.ts:790](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L790)

OPTIONAL host-computed active-surface field-read facts (#132) threaded onto the
[GateContext](GateContext.md) for `activeModeledSurfaceReaderGate` to fold. Supplied
ALWAYS-ON on the `--ir` path (the TS-AST scan is cheap); live TransitionNode
orphan reports as advisory until #130.

***

### benchmarkSubjects?

> `readonly` `optional` **benchmarkSubjects?**: [`BenchmarkSubjectFacts`](BenchmarkSubjectFacts.md)

Defined in: [gauntlet/src/runner.ts:687](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L687)

Always-on host-computed benchmark subject reachability facts.

***

### cache?

> `readonly` `optional` **cache?**: [`GateVerdictCache`](GateVerdictCache.md)

Defined in: [gauntlet/src/runner.ts:674](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L674)

The injected verdict store (fs-backed in the CLI host).

***

### capabilityLink?

> `readonly` `optional` **capabilityLink?**: [`CapabilityLinkFacts`](CapabilityLinkFacts.md)

Defined in: [gauntlet/src/runner.ts:738](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L738)

OPTIONAL host-computed capability-link facts (codex round-8, #1b) threaded onto the
[GateContext](GateContext.md) for `capabilityGateLinkGate` to fold. Supplied ONLY on the
`liteship check gates --ir --capability-gate` run, alongside a `gates` override that includes the gate. The
cache key is namespaced by the capability-gate mode (a capability-gate verdict never serves a
non-capability-gate run).

***

### checkGovernance?

> `readonly` `optional` **checkGovernance?**: [`CheckGovernanceFacts`](CheckGovernanceFacts.md)

Defined in: [gauntlet/src/runner.ts:689](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L689)

Required host-built governance facts for the default IR composition.

***

### codeOnly?

> `readonly` `optional` **codeOnly?**: (`source`) => `string`

Defined in: [gauntlet/src/runner.ts:812](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L812)

OPTIONAL host-built SOUND scanner codeOnly floor (`@liteship/audit`'s `codeOnlyAST`) threaded onto the
[GateContext](GateContext.md) as `codeOnly`. Code-scanning gates use it via `(context.codeOnly ?? codeOnly)`.
Supplied on the `--ir` path; omitted on the lean path (char-machine fallback, pinned equivalent).

#### Parameters

##### source

`string`

#### Returns

`string`

***

### composition?

> `readonly` `optional` **composition?**: [`CompositionFacts`](CompositionFacts.md)

Defined in: [gauntlet/src/runner.ts:774](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L774)

OPTIONAL host-computed composition-coverage facts (the LOCAL-VS-GLOBAL correctness
family — "locally green, globally untested interaction") threaded onto the
[GateContext](GateContext.md) for `compositionCoverageGate` to fold. Supplied ONLY on the
`liteship check gates --ir --composition` run, alongside a `gates` override that includes the
gate. The composition MODE namespaces the verdict cache key.

***

### diagnosticEmitterDetector?

> `readonly` `optional` **diagnosticEmitterDetector?**: (`source`) => readonly [`DiagnosticEmissionMatch`](DiagnosticEmissionMatch.md)[]

Defined in: [gauntlet/src/runner.ts:814](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L814)

Host-built parser-backed Diagnostics-call census.

#### Parameters

##### source

`string`

#### Returns

readonly [`DiagnosticEmissionMatch`](DiagnosticEmissionMatch.md)[]

***

### earlyReturnDetector?

> `readonly` `optional` **earlyReturnDetector?**: (`source`) => readonly [`EarlyReturnMatch`](EarlyReturnMatch.md)[]

Defined in: [gauntlet/src/runner.ts:806](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L806)

OPTIONAL host-built SOUND AST early-return detector (`detectEarlyReturnBeforeExpectAST`)
threaded onto [GateContext](GateContext.md) as `earlyReturnDetector`.

#### Parameters

##### source

`string`

#### Returns

readonly [`EarlyReturnMatch`](EarlyReturnMatch.md)[]

***

### env?

> `readonly` `optional` **env?**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [gauntlet/src/runner.ts:678](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L678)

The environment fingerprint folded into every key.

***

### featureEdges?

> `readonly` `optional` **featureEdges?**: [`FeatureEdgeFacts`](FeatureEdgeFacts.md)

Defined in: [gauntlet/src/runner.ts:792](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L792)

Required host-built fleet feature-edge connectivity facts.

***

### gates?

> `readonly` `optional` **gates?**: readonly [`Gate`](Gate.md)[]

Defined in: [gauntlet/src/runner.ts:685](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L685)

OPTIONAL gate-set override (Slice C, the `--supply-chain` opt-in). Defaults to
[LITESHIP\_IR\_GATES](../variables/LITESHIP_IR_GATES.md). The host composes `supplyChainGate` onto the IR-host
set for a `--supply-chain` run only; the default `--ir` run leaves it unset, so
the avionics gate never appears (no `not-evidenced` noise on the default path).

***

### mcdc?

> `readonly` `optional` **mcdc?**: [`McdcFacts`](McdcFacts.md)

Defined in: [gauntlet/src/runner.ts:712](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L712)

OPTIONAL host-computed MC/DC facts (the avionics tier — DO-178B Level A coverage via
condition-level mutation) threaded onto the [GateContext](GateContext.md) for
`mcdcCoverageGate` to fold. Supplied ONLY on the `liteship check gates --ir --mcdc` run,
alongside a `gates` override that includes the gate. The cache key is namespaced by
the MC/DC mode (an MC/DC verdict can never be served to a non-MC/DC run, or vice
versa) — exactly the `--mutate` cache-soundness lesson.

***

### mutation?

> `readonly` `optional` **mutation?**: [`MutationFacts`](MutationFacts.md)

Defined in: [gauntlet/src/runner.ts:703](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L703)

OPTIONAL host-computed mutation facts (Slice C — mutation-as-divergence) threaded
onto the [GateContext](GateContext.md) for `mutationDivergenceGate` to fold. Supplied ONLY
on the `liteship check gates --ir --mutate` run, alongside a `gates` override that includes
the gate. The cache key is namespaced by the mutation mode (a mutation-run
verdict can never be served to a non-mutation run, or vice versa).

***

### proof?

> `readonly` `optional` **proof?**: [`ProofFacts`](ProofFacts.md)

Defined in: [gauntlet/src/runner.ts:766](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L766)

OPTIONAL host-computed proof-strength facts (the LOCAL-VS-GLOBAL correctness family
— the lax-functor) threaded onto the [GateContext](GateContext.md) for `proofPropagationGate`
to propagate along the dep DAG. Supplied ONLY on the `liteship check gates --ir --proof` run,
alongside a `gates` override that includes the gate. The proof MODE namespaces the
verdict cache key (a proof-run verdict can never be served to a non-proof run, or
vice versa) — the same `--mutate` cache-soundness lesson.

***

### simulation?

> `readonly` `optional` **simulation?**: [`SimulationFacts`](SimulationFacts.md)

Defined in: [gauntlet/src/runner.ts:721](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L721)

OPTIONAL host-computed DST (deterministic-simulation) facts (the determinism
spine) threaded onto the [GateContext](GateContext.md) for `simulationDeterminismGate` to
fold. Supplied ONLY on the `liteship check gates --ir --simulate` run, alongside a `gates`
override that includes the gate. The cache key is namespaced by the simulation
mode (a simulation-run verdict can never be served to a non-simulation run, or
vice versa).

***

### skipDetector?

> `readonly` `optional` **skipDetector?**: (`source`) => readonly [`SkipMatch`](SkipMatch.md)[]

Defined in: [gauntlet/src/runner.ts:801](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L801)

OPTIONAL host-built SOUND AST skip detector (`@liteship/audit`'s `detectSkipsAST`) threaded onto
the [GateContext](GateContext.md) as `skipDetector`. The no-skipped-test gate uses it via
`(context.skipDetector ?? detectSkips)` — gaining line-agnostic multi-line/ASI/inner-describe
detection + the structural F2 conditionality the token scanner cannot produce. Supplied
ALWAYS-ON on the `--ir` path (the host deps `@liteship/audit`, the parse is cheap); omitted on the
lean `liteship check` / MCP path, where the token `detectSkips` fallback runs unchanged.

#### Parameters

##### source

`string`

#### Returns

readonly [`SkipMatch`](SkipMatch.md)[]

***

### spineRelation?

> `readonly` `optional` **spineRelation?**: [`SpineRelationFacts`](SpineRelationFacts.md)

Defined in: [gauntlet/src/runner.ts:783](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L783)

OPTIONAL host-computed two-axis spine-relation facts (Wave 8.5, the public
constitution's STATIC-projection half) threaded onto the [GateContext](GateContext.md) for
`spineRelationGate` to fold. Supplied ONLY on the `liteship check gates --ir --spine-relation`
run, alongside a `gates` override that includes the gate. The spine-relation MODE
namespaces the verdict cache key (a spine-relation verdict never serves a
non-spine-relation run).

***

### standards?

> `readonly` `optional` **standards?**: [`StandardsIntegrityFacts`](StandardsIntegrityFacts.md)

Defined in: [gauntlet/src/runner.ts:757](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L757)

OPTIONAL host-computed standards-integrity facts (the AGENT-SAFETY META-GAUNTLET,
the "raccoon rule") threaded onto the [GateContext](GateContext.md) for
`standardsIntegrityGate` to fold. Supplied alongside a `gates` override that
includes the gate. The CLI runs this ALWAYS-ON on the `--ir` path (the committed
snapshot diff is cheap to fold), so its verdict varies only with the live standards
surface + the committed snapshot + the sign-offs + the date — it carries no separate
cache mode (the env fingerprint + toolchain digest already key it).

***

### supplyChain?

> `readonly` `optional` **supplyChain?**: [`SupplyChainFacts`](SupplyChainFacts.md)

Defined in: [gauntlet/src/runner.ts:695](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L695)

OPTIONAL host-computed supply-chain facts (Slice C) threaded onto the
[GateContext](GateContext.md) for `supplyChainGate` to fold. Supplied ONLY on the
`--supply-chain` run, alongside a `gates` override that includes the gate.

***

### taint?

> `readonly` `optional` **taint?**: [`TaintFacts`](TaintFacts.md)

Defined in: [gauntlet/src/runner.ts:730](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L730)

OPTIONAL host-computed taint-flow facts (the TAINT-ANALYSIS family) threaded onto
the [GateContext](GateContext.md) for `taintFlowGate` to fold. Supplied ONLY on the
`liteship check gates --ir --taint` run, alongside a `gates` override that includes the gate.
The cache key is namespaced by the taint mode (a taint-run verdict can never be
served to a non-taint run, or vice versa) — exactly the `--mutate` cache-soundness
lesson.

***

### toolchainDigest?

> `readonly` `optional` **toolchainDigest?**: `string`

Defined in: [gauntlet/src/runner.ts:676](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L676)

The host's toolchain digest (gauntlet dist + version + env) — the anti-lie keystone.

***

### traceability?

> `readonly` `optional` **traceability?**: [`TraceabilityFacts`](TraceabilityFacts.md)

Defined in: [gauntlet/src/runner.ts:747](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L747)

OPTIONAL host-computed requirements-traceability facts (the avionics-tier ledger)
threaded onto the [GateContext](GateContext.md) for `traceabilityBridgeGate` to fold.
Supplied alongside a `gates` override that includes the gate. The CLI runs this
ALWAYS-ON on the `--ir` path (the committed ledger is cheap to fold), so its
verdict varies only with the ledger + the corpus headers + the date — it carries
no separate cache mode (the env fingerprint + toolchain digest already key it).
