# Worker Execution

Status: specified with physical profiles deferred; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/worker/06_execution/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Realize the exact core runtime-execution contract inside the isolated realm: lawful backends bound to matching drivers, scheduling before execution, cancellable sessions, and result transport back across a declared channel.

## Owns

- The worker execution host: `BoundWorkerDriver` roster (backend and driver kind provably agreeing, distributively) and core's exact `RuntimeExecutor`.
- The scheduling facility: `ExecutionRequest → ExecutionRequest`, phase-correct — scheduling can never claim execution happened.
- Constructible, cancellable, result-bearing execution sessions as per-use owned resources — the host begins them task-correlated: the caller names the exact task identity in the session request, the session the public path returns carries exactly that identity, and session A's cancel and result accept only session A.
- The result envelope: naming the exact session that produced it and the transaction generation it answers, with the full `RuntimeCommit` and the channel carrying it home. That the named generation equals the executed request's and the named channel is the physically used one stays `system/assurance`.

## Does not own

- Residual-program meaning, memory plans, images, the transactional fold, commit semantics, or backend contracts — all core.
- Physical application of the commit — that belongs to the realm owning the egress; the worker never fabricates an applied address.
- WebGPU-in-worker: an optional future offer that must pin exact prerequisites, not a default backend.

## The seam

The local backend set is derived as exactly javascript and wasm. The host binds real `ExecutionBackendDriver` contracts, not backend-name strings, and standing it up is an offer requiring the intrinsic scheduling facility. Nothing loose crosses the exit seam: no detached write plan, no partial transaction, no result without its commit.

## Laws

- A backend and its driver cannot disagree — distributively.
- The host actually executes; the executor is core's, exactly.
- Scheduling schedules before execution, never a commit identity.
- A result leaves as the real commit on a named channel.
- Beginning is task-correlated through the provider's generic operation; a session names its request and is cancellable and owned.

## Proof obligations

- Parity against the reference backend on the shipping path.
- End-to-end cost counts startup, transfer, synchronization, commit, and disposal — never only the inner kernel.

Both are implementation-phase obligations; crossover thresholds are empirical.

## Machine-checkable projection

```yaml
home:
  path: 01_hosts/worker/06_execution
  title: "Worker Execution"
  maturity: specified-with-physical-profiles-deferred
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - backends-exactly-javascript-and-wasm
  - driver-kind-provably-matches-backend
  - scheduling-before-execution
  - begin-is-task-correlated-caller-carried
  - results-leave-as-commits-on-named-channels
  empirical_contracts:
  - js-wasm-crossover
  - startup-thresholds
  - scheduling-quantum
  production_authority: false
```
