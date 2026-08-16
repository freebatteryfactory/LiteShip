# Worker Bounded Queues

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/worker/05_queue/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own repeatable SPSC bounded-queue resources over shared memory: producer and consumer identities, admission, overflow policy shape, backpressure, batch identity, stale-result rejection, cancellation, closure, and disposal.

## Owns

- The queue resource: exact shared buffer, payload admission contract, declared overflow policy, one producer endpoint, one consumer endpoint, owned lifecycle.
- Batch identity, the exact queue every batch belongs to — queue A provably cannot accept a batch naming queue B — and the generation relationship that makes staleness decidable. The queue's shared buffer is the exact buffer its construction request named.
- Payload-correlated construction: a queue of one admitted payload type is provably not a queue of another.

## Does not own

- Buffer and layout authority — `04_memory`. Transaction meaning — core. Scheduling policy — `06_execution` and empirical lanes.
- Fairness or priority machinery: absent until a real product requirement exists.

## SPSC is a law, not a comment

One queue has exactly one producer endpoint and one consumer endpoint, each pinned to its role at the type level. An erased role union would let one side silently hold both — the exact defect SPSC exists to make unrepresentable.

## Laws

- The endpoints pin their roles; producer is not consumer.
- Construction is payload-correlated through the admission contract.
- Batches carry identity and generation; dequeue is generation-aware.
- A queue is bounded by declared policy and owned exactly once.

## Proof obligations

- SPSC role exclusivity and atomic-order correctness hold at runtime.

`system/01_assurance`; slot width, capacity, polling, and batching thresholds are empirical lanes.

## Implementation boundary

Queue capacities, ring layouts, and atomic strategies remain empirical; a realization must preserve exact queue identity, endpoint roles, ordering, and overflow behavior.
