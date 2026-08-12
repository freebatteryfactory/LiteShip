# Runtime and General Compute Kernels

Status: specified with empirical backend crossover; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `16_runtime/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own transactional residual execution, dirty propagation, coherent write plans, backend drivers, and a generalized compute-kernel ABI shared by TypeScript, Rust native, Wasm, workers, and WebGPU.

## Owns

- The binding between one exact semantic cut and the execution that departs from it.
- The TypeScript semantic reference executor.
- Transaction fold, source generations, dirty frontier, and topological scheduling.
- Commit barriers and `RuntimeWritePlan`.
- Backend driver contracts and stable selection boundaries.
- General `KernelDefinition`, numeric contracts, buffer regions, command batches, statuses, and parity fixtures.
- Backend capability and failure/fallback contracts.

## Does not own

- DOM mutation.
- Worker, Wasm, WebGPU, or native host lifecycle.
- Domain meaning inside Rust.
- Settlement legality or planner objectives.
- Narrow domain-specific kernel crates as the constitutional compute surface.

## General compute ABI

The existing Rust compute crate is a seed, not a sacred API. Domain operations lower into reusable kernel families such as:

- map;
- reduce;
- scan;
- gather;
- scatter;
- compact;
- compare;
- quantize;
- interpolate;
- normalize;
- transform;
- parse;
- hash;
- DSP;
- geometry.

Every kernel declares identity, ABI version, typed input and output schemas, purity, determinism, requirements, buffer regions, supported backends, numeric contract, reference behavior, and parity fixture. Buffered runtime outputs preserve their schema value type through the commit barrier rather than pairing an arbitrary value with an unrelated schema reference.

Rust and Wasm execute lawful kernels. They do not become a second scene, state, collection, settlement, or operation authority.

## Transaction contract

Evidence arrives, source generations advance, affected nodes become dirty, dependencies recompute in topological order, outputs accumulate in one write plan, and one commit barrier publishes the coherent cut.

Hot execution uses caller-owned buffers, bounded queues, planned arenas, and batched backend crossings. Semantic commits address coherent revisions or change batches rather than hashing every scalar sample.

## Backend selection

The compiler pins an eligible backend at a stable program or segment boundary using content-addressed profiles and optional lightweight calibration. The runtime does not jitter between implementations inside one transaction.

Fallback behavior is explicit and preserves the reference semantics or returns a typed failure.

## Laws

- `RuntimeCommit` is generic over the cut it witnesses, so `ProjectionCommit` and every capture composition below it inherit the exact coordinate rather than a same-shaped substitute.
- A runtime transaction departs from one cut. Its loose `time` and `base: WorldRevision` retired for the same reason the commit's siblings did.
- An execution request names one departure coordinate and no sibling revision, time, world, or evidence member.
- A runtime commit is the residual-path witness that a committed cut exists, and cannot witness a draft. A preview must be able to evaluate and rasterize; what it must never do is produce this object, because everything downstream reads it as proof that application reality moved.
- A platform-native projection program binds the exact source revision and timebase without manufacturing a runtime cut for every displayed frame. A CSS view timeline is a sibling projection, not a transaction, and dragging it back through JavaScript for diagram symmetry would waste a battery the platform already paid for.
- One transaction publishes one coherent cut.
- TypeScript is the semantic reference.
- Every optimized backend passes differential parity under its declared numeric contract.
- Kernel primitives are reusable beyond one old call site.
- Bridge crossings are measured and batched.
- Buffers and growth are bounded by the memory plan.
- A backend cannot add semantic authority.
- Backend failure cannot expose a partial cut.

## Operation vocabulary

- `createRuntime` allocates a resource-owning executor.
- `execute` runs a program or command batch.
- `commit` publishes outputs.
- `dispose` ends runtime and backend activity.
- `defineKernel` is an expert API subject to the same ABI and proof obligations.

## Proof obligations

- No partial cut.
- Dirty-frontier and topological scheduling correctness.
- TypeScript/Rust/Wasm/worker/WebGPU parity.
- Bridge-inclusive crossover measurements.
- Claimed zero or bounded allocation over the exact hot body.
- Backend load, failure, fallback, and disposal semantics.
- General kernels support multiple core consumers rather than one specialized path.
- Long-running generation and queue behavior.

## Implementation boundary

The execution model and generalized kernel ABI are specified. Rust crate organization, command encoding, shared-memory strategy, backend implementations, and crossover thresholds are absent and empirical.

## Remaining work

Recruit and generalize the existing compute crate, remove fixed-buffer assumptions where inappropriate, build caller-owned batching, and establish representative backend profiles. GPU reconciliation remains ordered research after GPU-resident scene and collection workloads exist.

## Machine-checkable projection

```yaml
home:
  path: 00_core/16_runtime
  title: "Runtime and General Compute Kernels"
  maturity: specified-with-empirical-crossover
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - the-runtime-carrier-preserves-the-exact-cut
  - one-departure-coordinate-no-siblings
  - the-runtime-commit-witnesses-only-committed-cuts
  - platform-programs-are-not-per-frame-cuts
  - transactional-committed-cut
  - typescript-reference-runtime
  - general-kernel-abi
  - schema-typed-runtime-output-through-commit
  - optimized-backends-have-no-semantic-authority
  empirical_contracts:
  - backend-profile
  - bridge-inclusive-crossover
  - allocation-proof
  deferred_research:
  - broad-gpu-reconciliation
  production_authority: false
```
