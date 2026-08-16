# Web Islands

Status: specified; implementation absent

Authority: This README for local meaning and proof obligations; `types.ts` for the local semantic declaration surface

Source home: `01_hosts/web/11_island/`

Dependency authority: Actual source imports, constrained by the numbered path order. This README does not maintain a second dependency graph.

## Purpose

Own physical island activation and graph-cut joining: the act by which an inactive island becomes a live instance joined to an exact residual program at an exact committed revision, without losing a retained update or exposing a partial transaction.

## Owns

- Island identity, the retained-update window, and the inactive/active state algebra.
- The live island instance: region authority binding, exact revision and program, resumption position, and one owned lifetime.

## Does not own

- The activation decision. Settlement and partitioning across build, platform, edge, and live evidence are compiler meaning; only the unresolved portion and required drivers ship.
- Directive registration or lifecycle translation. The Astro target owns those and later projects into this home's contracts.

## Activation is an offer; inactivity is not failure

The plan selects a repeatable activation provider through `IslandActivationOffer`, whose exact requirement row composes the homes beneath it: the region manager, the commit-application authority, and the browser execution host, with plan-selected extras entering through the generic row. The provider's activate operation consumes one addressed `IslandJoin` per island — exact program, exact revision, one stream owner inside the resume window, and the owner `RegionMembership` — and materializes one owned island lifetime each time. Mount slots, initial envelopes, and replay cursors may be grounded before activation — the existence of `document` grounds nothing about an island region.

A live island holds the owner `RegionMembership` type inside its join; the transaction-scoped write authority is acquired from that membership for each commit, never frozen inside the long-lived instance.

A `client:when` condition that is pending or false leaves the island inactive with its retained updates available. No failure is fabricated. Failure stays phase-correct: no lawful provider is planning refusal; a malformed mount or serialized bootstrap value is admission failure; a selected activation that does not survive construction is realization failure; a provider that later disappears is withdrawal or typed evidence, per the contract.

Activation preserves exact graph and revision identity, preboot updates, one committed generation across sibling islands, region physical state, foreign boundaries, and the replay position. An island never reconstructs a competing local world.

## Laws

- An inactive island retains its updates and is not a failure.
- The active arm carries the typed live instance, never a blur.
- The join has one stream owner: identity lives once inside the resume request, and neither the join nor its window carries a sibling stream field.
- Activation's factory consumes the exact addressed join.
- An island holds persistent membership, never a frozen transaction authority.
- An island owns its whole lifetime, disposed exactly once.
- The plan selects one repeatable activation provider — an offer composing the region manager, projection, and execution — whose activate operation consumes one exact join per island; two islands are two instances from two joins.

## Proof obligations

- Sibling islands observe one committed generation.
- No pre-activation update is lost and no partial transaction is exposed.
- Opaque foreign internals stay contained behind explicit inputs and outputs.

All three are assurance-and-implementation territory.

## Implementation boundary

Specified. No activation code, no mount handling, no runtime joining exists or is authorized.
