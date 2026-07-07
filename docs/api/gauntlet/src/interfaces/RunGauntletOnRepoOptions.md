[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / RunGauntletOnRepoOptions

# Interface: RunGauntletOnRepoOptions

Defined in: [gauntlet/src/runner.ts:130](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L130)

Options for [runGauntletOnRepo](../functions/runGauntletOnRepo.md).

## Properties

### capabilityLink?

> `readonly` `optional` **capabilityLink?**: [`CapabilityLinkFacts`](CapabilityLinkFacts.md)

Defined in: [gauntlet/src/runner.ts:242](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L242)

The INJECTED capability-link facts (codex round-8, #1b) — OPTIONAL. A host (the CLI's
`czap check --ir --capability-gate` path) resolves each sanctioned skip's guard against the
canonical capability symbol table via `@czap/audit`'s capability-link oracle and threads the
decided [CapabilityLinkFacts](CapabilityLinkFacts.md) here for `capabilityGateLinkGate` to fold. Omit them ⇒ the
gate is not in the set.

***

### codeOnly?

> `readonly` `optional` **codeOnly?**: (`source`) => `string`

Defined in: [gauntlet/src/runner.ts:154](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L154)

The INJECTED SOUND `codeOnly` floor (the @czap/audit scanner `codeOnlyAST`) — OPTIONAL, same
pattern as [skipDetector](#skipdetector). Lands on the [GateContext](GateContext.md) for code-scanning gates to use
via `(context.codeOnly ?? codeOnly)`. Omit it (the lean path) and the char-machine fallback runs.

#### Parameters

##### source

`string`

#### Returns

`string`

***

### composition?

> `readonly` `optional` **composition?**: [`CompositionFacts`](CompositionFacts.md)

Defined in: [gauntlet/src/runner.ts:272](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L272)

The INJECTED composition-coverage facts (the LOCAL-VS-GLOBAL correctness family —
"locally green, globally untested interaction") — OPTIONAL. A host (the CLI's
`czap check --ir --composition` path) derives the interaction edges from the IR
call graph and classifies each integration-covered/uncovered, then threads the
decided [CompositionFacts](CompositionFacts.md) here, where they land on the [GateContext](GateContext.md)
for `compositionCoverageGate` to fold. Omit them (the default `--ir` run) and the
gate is simply not in the set — no corpus scan, no cost.

***

### earlyReturnDetector?

> `readonly` `optional` **earlyReturnDetector?**: (`source`) => readonly [`EarlyReturnMatch`](EarlyReturnMatch.md)[]

Defined in: [gauntlet/src/runner.ts:148](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L148)

The INJECTED SOUND early-return detector (`detectEarlyReturnBeforeExpectAST`) — OPTIONAL.
Lands on [GateContext](GateContext.md) for `noEarlyReturnTestGate` via
`(context.earlyReturnDetector ?? detectEarlyReturnBeforeExpect)`.

#### Parameters

##### source

`string`

#### Returns

readonly [`EarlyReturnMatch`](EarlyReturnMatch.md)[]

***

### fuzzCorpus?

> `readonly` `optional` **fuzzCorpus?**: [`FuzzCorpusFacts`](FuzzCorpusFacts.md)

Defined in: [gauntlet/src/runner.ts:252](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L252)

The INJECTED decode-fuzz facts (the untrusted-byte decode-surface hardening) —
OPTIONAL. A host (the `tests/fuzz` decode fuzzer, driven by the CLI fuzz path)
hammers every L4 decoder with the committed `tests/fixtures/fuzz-corpus` seeds +
a fixed, seeded count of `fast-check` generated inputs, classifies each outcome,
and threads the decided [FuzzCorpusFacts](FuzzCorpusFacts.md) here, where they land on the
[GateContext](GateContext.md) for `fuzzCorpusGate` to fold. Omit them (the lean path) and
the gate is simply not in the set — no fuzzer run, no cost.

***

### globs

> `readonly` **globs**: readonly `string`[]

Defined in: [gauntlet/src/runner.ts:134](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L134)

Repo-relative glob patterns selecting the files the gates consider.

***

### ir?

> `readonly` `optional` **ir?**: [`RepoIR`](RepoIR.md)

Defined in: [gauntlet/src/runner.ts:162](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L162)

The INJECTED repo-IR (Slice B) — OPTIONAL. The gauntlet is the lean engine
and never builds an IR; a host (the CLI, via `@czap/audit`'s `ts.Program`)
builds it and threads it here, where it lands on the [GateContext](GateContext.md) for
an IR-fold gate to read. Omit it (the lean path: `czap check` / MCP) and the
regex gates run unchanged.

***

### mcdc?

> `readonly` `optional` **mcdc?**: [`McdcFacts`](McdcFacts.md)

Defined in: [gauntlet/src/runner.ts:191](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L191)

The INJECTED MC/DC facts (the avionics tier — DO-178B Level A's coverage requirement,
realized as condition-level mutation) — OPTIONAL. A host (`@czap/audit`'s
condition-mutation engine + the CLI's per-pin vitest runner) generates + evaluates
the force-true/force-false pins per atomic condition, folds the two pins per
condition, then threads the decided [McdcFacts](McdcFacts.md) here, where they land on the
[GateContext](GateContext.md) for `mcdcCoverageGate` to fold. Omit them (the default `--ir`
run) and the gate is simply not in the set — no condition-mutants generated, no
suite-runs, no cost.

***

### mutation?

> `readonly` `optional` **mutation?**: [`MutationFacts`](MutationFacts.md)

Defined in: [gauntlet/src/runner.ts:180](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L180)

The INJECTED mutation facts (Slice C, the avionics tier — mutation-as-divergence)
— OPTIONAL. A host (`@czap/audit`'s mutation engine + the CLI's per-mutant vitest
runner) generates + evaluates the mutants, then threads the decided
[MutationFacts](MutationFacts.md) here, where they land on the [GateContext](GateContext.md) for
`mutationDivergenceGate` to fold. Omit them (the default `--ir` run) and the gate
is simply not in the set — no mutants generated, no suite-runs, no cost.

***

### proof?

> `readonly` `optional` **proof?**: [`ProofFacts`](ProofFacts.md)

Defined in: [gauntlet/src/runner.ts:262](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L262)

The INJECTED proof-strength facts (the LOCAL-VS-GLOBAL correctness family — the
lax-functor) — OPTIONAL. A host (the CLI's `czap check --ir --proof` path) reads
the proof signals (mutation score / coverage / property tests / enrolled
invariants), blends them into per-module scalars, and threads the decided
[ProofFacts](ProofFacts.md) here, where they land on the [GateContext](GateContext.md) for
`proofPropagationGate` to propagate along the dep DAG. Omit them (the default
`--ir` run) and the gate is simply not in the set — no signal reads, no cost.

***

### repoRoot

> `readonly` **repoRoot**: `string`

Defined in: [gauntlet/src/runner.ts:132](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L132)

Absolute root of the repo to run against.

***

### simulation?

> `readonly` `optional` **simulation?**: [`SimulationFacts`](SimulationFacts.md)

Defined in: [gauntlet/src/runner.ts:202](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L202)

The INJECTED DST (deterministic-simulation) facts (the avionics tier — the
determinism spine) — OPTIONAL. A host (the CLI's `czap check --ir --simulate`
path) drives the scenario corpus through the `@czap/core/simulation` harness
(replaying each seed twice, content-addressing the two byte-exact traces) and
threads the decided [SimulationFacts](SimulationFacts.md) here, where they land on the
[GateContext](GateContext.md) for `simulationDeterminismGate` to fold. Omit them (the
default `--ir` run) and the gate is simply not in the set — no world minted, no
scenario run, no cost.

***

### skipDetector?

> `readonly` `optional` **skipDetector?**: (`source`) => readonly [`SkipMatch`](SkipMatch.md)[]

Defined in: [gauntlet/src/runner.ts:142](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L142)

The INJECTED SOUND skip detector (the AST detector) — OPTIONAL. The gauntlet is the lean
engine and never deps `typescript`; a host (the CLI, which deps `@czap/audit`) builds
`detectSkipsAST` and threads it here, where it lands on the [GateContext](GateContext.md) for the
no-skipped-test gate to use via `(context.skipDetector ?? detectSkips)`. Omit it (the lean
path: `czap check` / MCP) and the token `detectSkips` fallback runs unchanged.

#### Parameters

##### source

`string`

#### Returns

readonly [`SkipMatch`](SkipMatch.md)[]

***

### standards?

> `readonly` `optional` **standards?**: [`StandardsIntegrityFacts`](StandardsIntegrityFacts.md)

Defined in: [gauntlet/src/runner.ts:224](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L224)

The INJECTED standards-integrity facts (the AGENT-SAFETY META-GAUNTLET, the
"raccoon rule") — OPTIONAL. A host (the CLI's
`packages/cli/src/lib/standards-surface.ts` extractor) reads the live standards
surface, content-addresses it, diffs it against the committed snapshot, applies the
owner sign-offs against the injected wall-clock date, and threads the decided
[StandardsIntegrityFacts](StandardsIntegrityFacts.md) here, where they land on the [GateContext](GateContext.md) for
`standardsIntegrityGate` to fold. Omit them (the lean path) and the gate is simply
not in the set — no surface read, no addressing cost.

***

### supplyChain?

> `readonly` `optional` **supplyChain?**: [`SupplyChainFacts`](SupplyChainFacts.md)

Defined in: [gauntlet/src/runner.ts:171](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L171)

The INJECTED supply-chain facts (Slice C, the avionics tier) — OPTIONAL. A
host (the CLI's `@czap/cli` analyzer) parses the lockfile, builds the SBOM,
and scans the workflows, then threads the decided [SupplyChainFacts](SupplyChainFacts.md)
here, where they land on the [GateContext](GateContext.md) for `supplyChainGate` to
fold. Omit them (the default `--ir` run) and the gate is simply not in the
set — no facts computed, no SBOM cost, no `not-evidenced` noise.

***

### taint?

> `readonly` `optional` **taint?**: [`TaintFacts`](TaintFacts.md)

Defined in: [gauntlet/src/runner.ts:234](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L234)

The INJECTED taint-flow facts (the TAINT-ANALYSIS family) — OPTIONAL. A host (the
CLI's `czap check --ir --taint` path) traces the source→sink dataflow via
`@czap/audit`'s GENERIC taint oracle (classified by the host-injected LiteShip
source/sink/sanitizer registry) and threads the decided [TaintFacts](TaintFacts.md) here,
where they land on the [GateContext](GateContext.md) for `taintFlowGate` to fold. Omit them
(the default `--ir` run) and the gate is simply not in the set — no dataflow trace,
no cost.

***

### traceability?

> `readonly` `optional` **traceability?**: [`TraceabilityFacts`](TraceabilityFacts.md)

Defined in: [gauntlet/src/runner.ts:213](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/runner.ts#L213)

The INJECTED requirements-traceability facts (the avionics-tier ledger,
DO-178B-style) — OPTIONAL. A host (the CLI's
`packages/cli/src/lib/traceability.ts` state machine) parses `traceability/*.yaml`,
scans the corpus for `// PROVES:` headers, runs the lifecycle fold against the
injected wall-clock date, and threads the decided [TraceabilityFacts](TraceabilityFacts.md) here,
where they land on the [GateContext](GateContext.md) for `traceabilityBridgeGate` to fold.
Omit them (the lean path) and the gate is simply not in the set — no YAML parse,
no corpus scan, no cost.
