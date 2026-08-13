# Worker Transfer and Custody

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/worker/03_transfer/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own what crossing the boundary does to ownership: the three custody modes, transfer tickets, custody receipts, and detachment evidence. A transfer list is not an optimization hint — it changes lawful custody.

## Owns

- The custody algebra: copied (both sides lawful), moved (sender custody ends), shared (explicit shared custody with a scoped role).
- The ticket: exact resource, exact mode, exact channel — mode-pinned so a moved ticket is provably not a copied one.
- The receipt: which ticket, who holds custody now, the physical address.
- Detachment evidence: only a move detaches, and the law says so.

## Does not own

- Channel mechanics — `02_message`, which the transfer offer requires by row: custody transitions ride declared channels. Shared-memory role semantics — `04_memory` owns roles over live buffers; this home owns the transition that created shared custody.
- Read-only shared views: deliberately absent until a real need proves them.

## The honesty boundary

TypeScript has no linear types. The architecture makes sender-after-move misuse unrepresentable where types can — mode-exact tickets, mode-correlated consummation, move-only detachment — and explicitly detectable where aliases and runtime detachment exceed the type system. That remainder is named `system/01_assurance`, not papered over.

## Laws

- The custody arms are exactly copy, move, and share, and a ticket must declare its mode — the bare ticket form is not a lawful type.
- A ticket pins its mode; consummation is mode-correlated.
- Only a move produces detachment evidence.
- A shared arm names its role; copy and move carry none.

## Proof obligations

- Sender custody actually changes after a move.
- Runtime detachment and revocation are honored on the shipping path.

Both are `system/01_assurance` obligations.

## Implementation boundary

Specified. No structured-clone or transfer-list code exists or is authorized.
