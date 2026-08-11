# Web Events and Listener Lifetime

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/web/03_event/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own browser event subscription, cancellation, and disposal, and the typed projection of events into core evidence or admitted operation invocations.

## Owns

- Listener identity and subscription lifecycle.
- The event projection algebra: evidence or operation, nothing else.
- The lifecycle relationship among region, listener, island, and provider.

## Does not own

- Evidence semantics, operation semantics, or authorization. Core owns all three.
- A second web-specific evidence algebra. Pointer, keyboard, touch, scroll, permission, and media inputs become core evidence or interaction updates only through this typed boundary.

## Events have identity; projections produce values

An event is representable: a `WebEventDescriptor` names its kind and subscription options (capture, passive, once), and an `AdmittedEventObservation` carries the descriptor, its region and target, and its payload. The final browser-event roster stays implementation evidence; the ability to represent an event does not.

A handler derives from a declared projection, and projections produce real values: the evidence arm projects an observation into an `EvidenceUpdate`, and the operation arm projects it into an `OperationInvocation` — an `OperationReference` names what may be invoked, the projection supplies the invocation. There is no arm for an arbitrary callback: that arm would let model output attach behavior, which is the exact old defect this boundary retires.

Every listener is an owned resource with a named owner — the realization instance that materialized it disposes it exactly once. The plan selects the subscription authority through an offer requiring the observation facility and the region manager; subscriptions are its repeatable per-use resources, attached to persistent membership.

## Laws

- An event projects to evidence or an operation, never a free function, and an observation cannot be constructed without its target and payload contract.
- The operation projection produces a real invocation; the evidence projection produces a core update — and the produced value owns its identity, with no sibling reference field to contradict it.
- The plan provides a subscription authority whose subscribe operation consumes the complete request — membership, target, descriptor, projection — and returns the owned subscription.
- A subscription attaches to persistent region membership, never a frozen transaction lease.
- A listener is always an owned resource with a named owner.
- The authority is an offer requiring the observation facility and the region manager.

## Proof obligations

- Replacing a rendered structure disposes its old listeners, under repeated and concurrent replacement.
- No listener outlives its region writer or its island.

Both are implementation-fixture obligations.

## Implementation boundary

Specified. No addEventListener call, no dispatch code, no disposal machinery exists or is authorized.

## Machine-checkable projection

```yaml
home:
  path: 01_hosts/web/03_event
  title: "Web Events and Listener Lifetime"
  maturity: specified
  implementation: absent
  runtime_exports: false
  dependency_authority: source-imports
  semantic_decisions:
  - events-project-to-evidence-or-operations-never-free-functions
  - handlers-derive-from-admitted-operation-bindings
  - listeners-are-owned-and-disposed-once
  - no-second-evidence-algebra
  production_authority: false
```
