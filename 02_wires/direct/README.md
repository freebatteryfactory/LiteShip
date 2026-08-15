# Direct Wire: In-Process Invocation

Status: architecture specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `02_wires/direct/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Invoke an operation in the same address space. No serialization, no transport, no encoding.

## Owns

- The in-process refusal population.
- The in-process exchange population.

Both are narrowings of the umbrella's algebras. This home declares no type of its own beyond them, and that is the point.

`DirectMigrationExchange` applies that same narrowing to core's exact migration report and failure contract; system binds the program identity downstream.

## Does not own

- Anything the umbrella owns. Wire identity, exposure, the caller distinction, and the shape of a refusal all belong to `02_wires/`.
- Operation meaning. Core's.
- A dispatch mechanism, a registry, or a call convention. Those are physical and belong to a host and to `system/04_bootstrap` when it exists.

## Why this child exists as architecture

It is the honesty test for the umbrella.

A boundary vocabulary designed around HTTP forces every other protocol to carry arms it cannot produce, and the fabrication is invisible: the type compiles, the arm is simply never constructed, and consumers branch on states that cannot occur. The direct wire has the narrowest surface of any wire, so if the umbrella were transport-shaped rather than boundary-shaped, this is the home where it would show.

It shows by **narrowing**, not by declaring less. `DirectRefusal` and `DirectExchange` are `Extract`ed from the umbrella's algebras, so they stay assignable to them and a consumer written against a general wire accepts a direct one unchanged. A child that declared its own two-arm exchange would look identical at the call site and be a second vocabulary — the defect this repository has paid for at every layer.

## What in-process cannot do

**It cannot fail to decode.** The input is already typed when the caller holds it. There is no decoding step in which to fail, and a malformed direct invocation would not have compiled. `DirectRefusal` therefore has one arm: `unrecognized`. Catalog lookup is still a genuine runtime refusal — a caller may name an operation this wire does not expose.

**It cannot lose an answer.** An in-process call that returns has delivered by construction; one that does not return took the process with it, leaving nobody to hold the exchange. `DirectExchange` has no `undelivered` arm.

That second absence is the payoff. In-process is exactly the case where the expensive distinction the umbrella exists to protect — *the operation ran but the answer was lost* — genuinely cannot arise. A child forced to carry the arm anyway would be evidence the algebra was shaped by transports rather than by boundaries.

## Laws

- The direct wire narrows the umbrella rather than forking it: its populations are assignable to the umbrella's, and the umbrella's are not assignable to its.
- In-process has no `undelivered` arm and no `malformed` arm, and both populations are pinned by count.
- Narrowing did not cost exactness: a direct exchange is exact over the operation it projects, and the broad form does not substitute.
- Direct migration carries core's exact report and typed failure under the exact operation identity.

## Proof obligations

Runtime claims a type cannot express:

- That a direct invocation reaches the same handler an HTTP or CLI invocation would, with no fast path around policy.
- That an operation refusing or failing in-process produces a receipt, not a thrown exception that skips the exchange entirely.
- That cancellation propagates into a synchronous call rather than being silently ignored because there is no socket to close.

## Implementation boundary

Architecture only. No implementation exists or is authorized.
