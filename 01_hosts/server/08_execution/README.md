# Server Execution

Status: specified with physical profiles deferred; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/server/08_execution/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Realize the exact core runtime-execution contract on the server: javascript, wasm, and host-native backends bound to matching drivers, scheduling before execution, and cancellable sessions.

## Owns

- The execution host: `BoundServerDriver` roster (kind provably matching backend, host-native included) and core's exact `RuntimeExecutor`.
- The scheduling facility: `ExecutionRequest → ExecutionRequest`, phase-correct.
- Constructible, cancellable, result-bearing execution sessions as per-use owned resources — the host begins them, and the result is the real commit.

## Does not own

- Program, image, memory-plan, commit, or backend-contract meaning — core. JavaScript remains the reference behavior every other driver earns parity against.

## Laws

- A backend and its driver cannot disagree — distributively, native included.
- The host actually executes — core's executor, exactly.
- Scheduling schedules before execution, never a commit identity.
- A session names its request and is cancellable and owned.

## Proof obligations

- Native and wasm drivers preserve reference semantics; end-to-end cost is complete.

`system/01_assurance` and empirical lanes.
