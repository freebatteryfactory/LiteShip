[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / NegativeControlFact

# Interface: NegativeControlFact

Defined in: [gauntlet/src/facts/check-governance-facts.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L43)

One blocking (or advisory) check's negative-control verdict for `check-negative-control`.

## Properties

### blocking

> `readonly` **blocking**: `boolean`

Defined in: [gauntlet/src/facts/check-governance-facts.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L47)

Whether this check holds blocking authority (only blocking checks are judged).

***

### exists

> `readonly` **exists**: `boolean`

Defined in: [gauntlet/src/facts/check-governance-facts.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L51)

Whether the declared negativeControl path EXISTS on disk (false when `negativeControl` is null).

***

### id

> `readonly` **id**: `string`

Defined in: [gauntlet/src/facts/check-governance-facts.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L45)

The check identity, `check/<slug>`.

***

### negativeControl

> `readonly` **negativeControl**: `string` \| `null`

Defined in: [gauntlet/src/facts/check-governance-facts.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L49)

The declared negativeControl fixture path, or `null` when the check declares none.
