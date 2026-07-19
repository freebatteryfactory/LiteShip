[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / nodeContext

# Function: nodeContext()

> **nodeContext**(`repoRoot`, `globs`, `ir?`, `supplyChain?`, `mutation?`, `simulation?`, `traceability?`, `standards?`, `mcdc?`, `fuzzCorpus?`): [`GateContext`](../interfaces/GateContext.md)

Defined in: [gauntlet/src/node-context.ts:112](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/node-context.ts#L112)

A [GateContext](../interfaces/GateContext.md) backed by the filesystem at `repoRoot`, scoped to the
files matched by `globs`.

- `files()` returns the repo-relative paths matched by `globs` (sync glob with
  `cwd: repoRoot`, `node_modules` + `dist` ignored, dotfiles excluded),
  computed once eagerly and sorted for deterministic ordering.
- `readFile(rel)` reads `repoRoot/rel` as UTF-8, or returns `undefined` when
  the file is absent (ENOENT only — any other error rethrows; no silent catch).
- `repoRoot` is returned verbatim.

The optional `ir` is the INJECTED repo-IR capability (Slice B): a host (the
CLI, via `@liteship/audit`'s `ts.Program`) builds it and threads it through so an
IR-fold gate can read `context.ir`. The gauntlet stays lean — it RECEIVES the
IR, never builds one. When omitted, `ir` is absent and regex gates run
unchanged (back-compat).

The optional `supplyChain` is the INJECTED supply-chain facts capability
(Slice C, the avionics tier): a host (the CLI's `@liteship/cli` analyzer) parses
the lockfile, builds the SBOM, decodes the ShipCapsule, and scans the
workflows, then threads the decided [SupplyChainFacts](../interfaces/SupplyChainFacts.md) through so the
`supplyChainGate` can fold them. Same lean-engine pattern as `ir` — the
gauntlet RECEIVES the facts, never computes them. Omitted ⇒ absent.

## Parameters

### repoRoot

`string`

Absolute root the gate's paths resolve against.

### globs

readonly `string`[]

Repo-relative glob patterns selecting the gate's file scope.
The optional `mutation` is the INJECTED mutation-facts capability (Slice C, the
avionics tier — mutation-as-divergence): a host (`@liteship/audit`'s mutation engine +
the CLI's per-mutant vitest runner) generates the mutants, evaluates each, and
folds the verdicts into [MutationFacts](../interfaces/MutationFacts.md), then threads them through so the
`mutationDivergenceGate` can fold them. Same lean-engine pattern as `ir` /
`supplyChain` — the gauntlet RECEIVES the facts, never computes them. Omitted ⇒
absent (the default `--ir` run, where mutation is opt-in via `--mutate`).

The optional `simulation` is the INJECTED DST (deterministic-simulation) facts
capability (the avionics tier — the determinism spine): a host (the CLI's
`liteship check --ir --simulate` path) drives the scenario corpus through the
`@liteship/core/simulation` harness (replaying each seed twice, content-addressing the
two byte-exact traces) and folds the verdicts into [SimulationFacts](../interfaces/SimulationFacts.md), then
threads them through so the `simulationDeterminismGate` can fold them. Same
lean-engine pattern as `ir` / `supplyChain` / `mutation` — the gauntlet RECEIVES
the facts, never mints a world or runs a scenario. Omitted ⇒ absent (the default
`--ir` run, where simulation is opt-in via `--simulate`).

### ir?

[`RepoIR`](../interfaces/RepoIR.md)

Optional pre-built repo-IR to inject onto the context.

### supplyChain?

[`SupplyChainFacts`](../interfaces/SupplyChainFacts.md)

Optional pre-computed supply-chain facts to inject.

### mutation?

[`MutationFacts`](../interfaces/MutationFacts.md)

Optional pre-computed mutation facts to inject.

### simulation?

[`SimulationFacts`](../interfaces/SimulationFacts.md)

Optional pre-computed DST (simulation) facts to inject.

The optional `traceability` is the INJECTED requirements-traceability facts
capability (the avionics-tier ledger): a host (the CLI's
`packages/cli/src/lib/traceability.ts` state machine) parses `traceability/*.yaml`,
scans the corpus for `// PROVES:` headers, runs the lifecycle fold against the
injected wall-clock date, and folds the verdicts into [TraceabilityFacts](../interfaces/TraceabilityFacts.md),
then threads them through so the `traceabilityBridgeGate` can fold them. Same
lean-engine pattern as `ir` / `supplyChain` / `mutation` / `simulation` — the
gauntlet RECEIVES the facts, never parses YAML or reads a clock. Omitted ⇒ absent.

### traceability?

[`TraceabilityFacts`](../interfaces/TraceabilityFacts.md)

Optional pre-computed requirements-traceability facts to inject.

The optional `standards` is the INJECTED standards-integrity facts capability (the
AGENT-SAFETY META-GAUNTLET, the "raccoon rule"): a host (the CLI's
`packages/cli/src/lib/standards-surface.ts` extractor) reads the live standards
surface, content-addresses it, diffs it against the committed snapshot, applies the
owner sign-offs against the injected wall-clock date, and folds the verdicts into
[StandardsIntegrityFacts](../interfaces/StandardsIntegrityFacts.md), then threads them through so the
`standardsIntegrityGate` can fold them. Same lean-engine pattern as the others — the
gauntlet RECEIVES the facts, never reads config or content-addresses. Omitted ⇒ absent.

### standards?

[`StandardsIntegrityFacts`](../interfaces/StandardsIntegrityFacts.md)

Optional pre-computed standards-integrity facts to inject.

### mcdc?

[`McdcFacts`](../interfaces/McdcFacts.md)

### fuzzCorpus?

[`FuzzCorpusFacts`](../interfaces/FuzzCorpusFacts.md)

## Returns

[`GateContext`](../interfaces/GateContext.md)
