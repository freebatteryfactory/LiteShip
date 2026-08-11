# Worker Instance

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/worker/01_instance/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own the live worker realm after bootstrap: instance identity, lifecycle state, readiness, crash and withdrawal evidence, graceful close, and disposal.

## Owns

- The instance resource: identity, the exact entry envelope it was admitted with, its lifecycle state, and its owned disposal.
- The phase-correct lifecycle algebra: admitted, ready, closing, closed, terminated, crashed, withdrawn.
- The one worker-authored exit: graceful close, which mints the close receipt the closed arm records.

## Does not own

- The parent-side constructor or termination authority — parent termination is a fact this realm observes, recorded as its own arm, never conflated with close.
- Channel, buffer, queue, or execution lifecycles — each resource owns its own.

## Phase-correct lifecycle

Readiness is not activity. A crash carries diagnostics; a close carries its receipt; a termination carries neither, because no worker-side code ran to produce one; a platform withdrawal is its own fact. Collapsing any two of these would recreate the "not available here means missing binding" defect the shared calculus exists to prevent.

## Laws

- The lifecycle arms are exactly the declared seven.
- A crash carries evidence; a graceful close carries its receipt.
- The instance is owned and names its exact bootstrap envelope.

## Proof obligations

- Disposal happens exactly once per live instance.
- Crash, withdrawal, and termination produce correct evidence at runtime and are distinguishable from close.

Both are `system/assurance` obligations.

## Implementation boundary

Specified. No lifecycle, signal, or close code exists or is authorized.

## Machine-checkable projection

```yaml
home:
  path: 01_hosts/worker/01_instance
  title: "Worker Instance"
  maturity: specified
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - seven-phase-correct-lifecycle-arms
  - close-is-worker-authored-termination-is-observed
  - instance-names-its-exact-entry
  production_authority: false
```
