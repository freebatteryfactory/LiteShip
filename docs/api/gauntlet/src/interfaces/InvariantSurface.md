[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / InvariantSurface

# Interface: InvariantSurface

Defined in: [gauntlet/src/facts/standards-facts.ts:129](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L129)

One INVARIANT in the traceability ledger (`traceability/invariants.yaml`): its
id, level, and how it is proved. An invariant REMOVED, its level LOWERED, or a
PROOF replaced by a WAIVER is a WEAKEN.

## Properties

### \_tag

> `readonly` **\_tag**: `"invariant"`

Defined in: [gauntlet/src/facts/standards-facts.ts:130](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L130)

***

### id

> `readonly` **id**: `string`

Defined in: [gauntlet/src/facts/standards-facts.ts:132](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L132)

The stable INV-* id.

***

### level

> `readonly` **level**: [`AssuranceLevel`](../type-aliases/AssuranceLevel.md)

Defined in: [gauntlet/src/facts/standards-facts.ts:134](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L134)

The invariant's assurance level — LOWERING it is a WEAKEN.

***

### proofKind

> `readonly` **proofKind**: `"waiver"` \| `"proof"`

Defined in: [gauntlet/src/facts/standards-facts.ts:136](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/standards-facts.ts#L136)

How the invariant is upheld — `proof` (a proving test) is stronger than `waiver` (a signed deferral).
