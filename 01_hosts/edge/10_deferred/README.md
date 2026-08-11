# Edge Deferred Work

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/edge/10_deferred/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own explicitly bounded post-response work: task identity, request ancestry, retained capability scope, bounded lifetime, cancellation, completion and failure evidence, and disposal.

## Owns

- The deferred task: descended from its exact invocation, carrying actual work (an operation invocation) under an actual bound (flush-tied or deadline-carrying), holding an exact declared capability scope — never the whole realm — and owned.
- The phase-correct outcome algebra: pending, completed-with-receipt, failed, cancelled.
- The enqueue contract: ancestry, work, scope, and bound together — no naked deferral.

## Does not own

- A long-lived service model — that is server's `06_service`, and smuggling it here would break the edge realm contract.

## Laws

- A task descends from its exact invocation with a declared scope.
- The outcome arms are phase-correct with completion receipts.
- Enqueueing requires ancestry and scope together.

## Proof obligations

- Deferred work remains bounded and correctly attributed at runtime.

`system/assurance`; the work budget is empirical.

## Implementation boundary

Specified. No waitUntil-style or scheduling code exists or is authorized.

## Machine-checkable projection

```yaml
home:
  path: 01_hosts/edge/10_deferred
  title: "Edge Deferred Work"
  maturity: specified
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - tasks-descend-from-their-invocation
  - declared-capability-scope-never-the-realm
  - bounded-by-declaration
  production_authority: false
```
