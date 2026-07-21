[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / LitelaunchCacheOptions

# Interface: LitelaunchCacheOptions

Defined in: [gauntlet/src/runner.ts:579](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L579)

The INJECTED verdict-cache options the host threads into
[litelaunchGauntletWithIR](../functions/litelaunchGauntletWithIR.md) (Slice B, B2). All optional — omit them and the
run is a full, uncached run (back-compat). The [GateVerdictCache](GateVerdictCache.md) store
and the `toolchainDigest` are HOST-built (the CLI owns `fs` + crypto); the lean
engine only consumes them.

## Properties

### activeSurfaceFacts?

> `readonly` `optional` **activeSurfaceFacts?**: [`ActiveSurfaceFacts`](ActiveSurfaceFacts.md)

Defined in: [gauntlet/src/runner.ts:693](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L693)

OPTIONAL host-computed active-surface field-read facts (#132) threaded onto the
[GateContext](GateContext.md) for `activeModeledSurfaceReaderGate` to fold. Supplied
ALWAYS-ON on the `--ir` path (the TS-AST scan is cheap); live TransitionNode
orphan reports as advisory until #130.

***

### cache?

> `readonly` `optional` **cache?**: [`GateVerdictCache`](GateVerdictCache.md)

Defined in: [gauntlet/src/runner.ts:581](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L581)

The injected verdict store (fs-backed in the CLI host).

***

### capabilityLink?

> `readonly` `optional` **capabilityLink?**: [`CapabilityLinkFacts`](CapabilityLinkFacts.md)

Defined in: [gauntlet/src/runner.ts:641](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L641)

OPTIONAL host-computed capability-link facts (codex round-8, #1b) threaded onto the
[GateContext](GateContext.md) for `capabilityGateLinkGate` to fold. Supplied ONLY on the
`liteship check --ir --capability-gate` run, alongside a `gates` override that includes the gate. The
cache key is namespaced by the capability-gate mode (a capability-gate verdict never serves a
non-capability-gate run).

***

### codeOnly?

> `readonly` `optional` **codeOnly?**: (`source`) => `string`

Defined in: [gauntlet/src/runner.ts:713](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L713)

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

Defined in: [gauntlet/src/runner.ts:677](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L677)

OPTIONAL host-computed composition-coverage facts (the LOCAL-VS-GLOBAL correctness
family — "locally green, globally untested interaction") threaded onto the
[GateContext](GateContext.md) for `compositionCoverageGate` to fold. Supplied ONLY on the
`liteship check --ir --composition` run, alongside a `gates` override that includes the
gate. The composition MODE namespaces the verdict cache key.

***

### earlyReturnDetector?

> `readonly` `optional` **earlyReturnDetector?**: (`source`) => readonly [`EarlyReturnMatch`](EarlyReturnMatch.md)[]

Defined in: [gauntlet/src/runner.ts:707](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L707)

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

Defined in: [gauntlet/src/runner.ts:585](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L585)

The environment fingerprint folded into every key.

***

### gates?

> `readonly` `optional` **gates?**: readonly [`Gate`](Gate.md)[]

Defined in: [gauntlet/src/runner.ts:592](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L592)

OPTIONAL gate-set override (Slice C, the `--supply-chain` opt-in). Defaults to
[LITESHIP\_IR\_GATES](../variables/LITESHIP_IR_GATES.md). The host composes `supplyChainGate` onto the IR-host
set for a `--supply-chain` run only; the default `--ir` run leaves it unset, so
the avionics gate never appears (no `not-evidenced` noise on the default path).

***

### mcdc?

> `readonly` `optional` **mcdc?**: [`McdcFacts`](McdcFacts.md)

Defined in: [gauntlet/src/runner.ts:615](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L615)

OPTIONAL host-computed MC/DC facts (the avionics tier — DO-178B Level A coverage via
condition-level mutation) threaded onto the [GateContext](GateContext.md) for
`mcdcCoverageGate` to fold. Supplied ONLY on the `liteship check --ir --mcdc` run,
alongside a `gates` override that includes the gate. The cache key is namespaced by
the MC/DC mode (an MC/DC verdict can never be served to a non-MC/DC run, or vice
versa) — exactly the `--mutate` cache-soundness lesson.

***

### mutation?

> `readonly` `optional` **mutation?**: [`MutationFacts`](MutationFacts.md)

Defined in: [gauntlet/src/runner.ts:606](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L606)

OPTIONAL host-computed mutation facts (Slice C — mutation-as-divergence) threaded
onto the [GateContext](GateContext.md) for `mutationDivergenceGate` to fold. Supplied ONLY
on the `liteship check --ir --mutate` run, alongside a `gates` override that includes
the gate. The cache key is namespaced by the mutation mode (a mutation-run
verdict can never be served to a non-mutation run, or vice versa).

***

### proof?

> `readonly` `optional` **proof?**: [`ProofFacts`](ProofFacts.md)

Defined in: [gauntlet/src/runner.ts:669](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L669)

OPTIONAL host-computed proof-strength facts (the LOCAL-VS-GLOBAL correctness family
— the lax-functor) threaded onto the [GateContext](GateContext.md) for `proofPropagationGate`
to propagate along the dep DAG. Supplied ONLY on the `liteship check --ir --proof` run,
alongside a `gates` override that includes the gate. The proof MODE namespaces the
verdict cache key (a proof-run verdict can never be served to a non-proof run, or
vice versa) — the same `--mutate` cache-soundness lesson.

***

### simulation?

> `readonly` `optional` **simulation?**: [`SimulationFacts`](SimulationFacts.md)

Defined in: [gauntlet/src/runner.ts:624](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L624)

OPTIONAL host-computed DST (deterministic-simulation) facts (the determinism
spine) threaded onto the [GateContext](GateContext.md) for `simulationDeterminismGate` to
fold. Supplied ONLY on the `liteship check --ir --simulate` run, alongside a `gates`
override that includes the gate. The cache key is namespaced by the simulation
mode (a simulation-run verdict can never be served to a non-simulation run, or
vice versa).

***

### skipDetector?

> `readonly` `optional` **skipDetector?**: (`source`) => readonly [`SkipMatch`](SkipMatch.md)[]

Defined in: [gauntlet/src/runner.ts:702](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L702)

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

Defined in: [gauntlet/src/runner.ts:686](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L686)

OPTIONAL host-computed two-axis spine-relation facts (Wave 8.5, the public
constitution's STATIC-projection half) threaded onto the [GateContext](GateContext.md) for
`spineRelationGate` to fold. Supplied ONLY on the `liteship check --ir --spine-relation`
run, alongside a `gates` override that includes the gate. The spine-relation MODE
namespaces the verdict cache key (a spine-relation verdict never serves a
non-spine-relation run).

***

### standards?

> `readonly` `optional` **standards?**: [`StandardsIntegrityFacts`](StandardsIntegrityFacts.md)

Defined in: [gauntlet/src/runner.ts:660](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L660)

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

Defined in: [gauntlet/src/runner.ts:598](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L598)

OPTIONAL host-computed supply-chain facts (Slice C) threaded onto the
[GateContext](GateContext.md) for `supplyChainGate` to fold. Supplied ONLY on the
`--supply-chain` run, alongside a `gates` override that includes the gate.

***

### taint?

> `readonly` `optional` **taint?**: [`TaintFacts`](TaintFacts.md)

Defined in: [gauntlet/src/runner.ts:633](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L633)

OPTIONAL host-computed taint-flow facts (the TAINT-ANALYSIS family) threaded onto
the [GateContext](GateContext.md) for `taintFlowGate` to fold. Supplied ONLY on the
`liteship check --ir --taint` run, alongside a `gates` override that includes the gate.
The cache key is namespaced by the taint mode (a taint-run verdict can never be
served to a non-taint run, or vice versa) — exactly the `--mutate` cache-soundness
lesson.

***

### toolchainDigest?

> `readonly` `optional` **toolchainDigest?**: `string`

Defined in: [gauntlet/src/runner.ts:583](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L583)

The host's toolchain digest (gauntlet dist + version + env) — the anti-lie keystone.

***

### traceability?

> `readonly` `optional` **traceability?**: [`TraceabilityFacts`](TraceabilityFacts.md)

Defined in: [gauntlet/src/runner.ts:650](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L650)

OPTIONAL host-computed requirements-traceability facts (the avionics-tier ledger)
threaded onto the [GateContext](GateContext.md) for `traceabilityBridgeGate` to fold.
Supplied alongside a `gates` override that includes the gate. The CLI runs this
ALWAYS-ON on the `--ir` path (the committed ledger is cheap to fold), so its
verdict varies only with the ledger + the corpus headers + the date — it carries
no separate cache mode (the env fingerprint + toolchain digest already key it).
