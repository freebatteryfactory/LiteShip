[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / ResolvedInvariant

# Interface: ResolvedInvariant

Defined in: [gauntlet/src/traceability-facts.ts:80](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/traceability-facts.ts#L80)

One declared invariant + its resolved lifecycle state (the gate's fold unit).

## Properties

### category

> `readonly` **category**: `string`

Defined in: [gauntlet/src/traceability-facts.ts:88](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/traceability-facts.ts#L88)

The grouping category (determinism | crdt | content-address | …).

***

### id

> `readonly` **id**: `string`

Defined in: [gauntlet/src/traceability-facts.ts:82](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/traceability-facts.ts#L82)

The stable INV-* id (the head-probe key the `PROVES` headers name).

***

### law

> `readonly` **law**: `string`

Defined in: [gauntlet/src/traceability-facts.ts:84](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/traceability-facts.ts#L84)

The LAW this invariant upholds (one line).

***

### level

> `readonly` **level**: [`AssuranceLevel`](../type-aliases/AssuranceLevel.md)

Defined in: [gauntlet/src/traceability-facts.ts:86](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/traceability-facts.ts#L86)

The assurance level — an untraced/expired L3/L4 invariant HARD-FAILS.

***

### state

> `readonly` **state**: [`InvariantState`](../type-aliases/InvariantState.md)

Defined in: [gauntlet/src/traceability-facts.ts:90](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/traceability-facts.ts#L90)

The resolved lifecycle state — the deterministic fold's verdict.
