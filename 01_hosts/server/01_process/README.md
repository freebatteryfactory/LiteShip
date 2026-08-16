# Server Process

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/server/01_process/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own the admitted host-process authority — identity, stdio resources, signals — and the child-process provider whose children are repeatable per-use resources with configuration-scoped environment and limits.

## Owns

- The host process as a narrow admitted authority, never a raw global; platform-held custody.
- Child processes: owned resources with scoped configuration addresses, own stdio, cancellation, and phase-correct exits (exited-with-receipt, signalled, crashed-with-diagnostics).
- The closed signal and stdio vocabularies.

## Does not own

- Native-tool contracts — `07_tool` composes over children. Service supervision — `06_service`.

## Laws

- The signal and stdio vocabularies are closed.
- The exit arms are phase-correct with their evidence.
- A child is owned, configuration-scoped, and cancellable; spawning consumes a complete scoped request.

## Proof obligations

- Resource limits and scoped environments are honored at runtime.

`system/01_assurance`; concurrency and pool sizes are empirical.
