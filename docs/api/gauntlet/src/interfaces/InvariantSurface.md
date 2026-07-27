[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / InvariantSurface

# Interface: InvariantSurface

Defined in: [gauntlet/src/facts/standards-facts.ts:147](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L147)

One INVARIANT in the traceability ledger (`traceability/invariants.yaml`): its
id, level, and how it is proved. An invariant REMOVED, its level LOWERED, or a
PROOF replaced by a WAIVER is a WEAKEN.

## Properties

### \_tag

> `readonly` **\_tag**: `"invariant"`

Defined in: [gauntlet/src/facts/standards-facts.ts:148](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L148)

***

### id

> `readonly` **id**: `string`

Defined in: [gauntlet/src/facts/standards-facts.ts:150](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L150)

The stable INV-* id.

***

### level

> `readonly` **level**: [`AssuranceLevel`](../type-aliases/AssuranceLevel.md)

Defined in: [gauntlet/src/facts/standards-facts.ts:152](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L152)

The invariant's assurance level — LOWERING it is a WEAKEN.

***

### proofKind

> `readonly` **proofKind**: `"waiver"` \| `"proof"`

Defined in: [gauntlet/src/facts/standards-facts.ts:154](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L154)

How the invariant is upheld — `proof` (a proving test) is stronger than `waiver` (a signed deferral).
