[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / NegativeControlFact

# Interface: NegativeControlFact

Defined in: [gauntlet/src/facts/check-governance-facts.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L49)

One blocking (or advisory) check's negative-control verdict for `check-negative-control`.

Every blocking check must declare a `negativeControl` that EXISTS (a real
red-fixture / regression-guard / self-proving gate). There is no blocker
exemption path: inability to prove the authority can fail is itself a gap.

## Properties

### blocking

> `readonly` **blocking**: `boolean`

Defined in: [gauntlet/src/facts/check-governance-facts.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L53)

Whether this check holds blocking authority (only blocking checks are judged).

***

### exists

> `readonly` **exists**: `boolean`

Defined in: [gauntlet/src/facts/check-governance-facts.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L57)

Whether the declared negativeControl path EXISTS on disk (false when `negativeControl` is null).

***

### id

> `readonly` **id**: `string`

Defined in: [gauntlet/src/facts/check-governance-facts.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L51)

The check identity, `check/<slug>`.

***

### negativeControl

> `readonly` **negativeControl**: `string` \| `null`

Defined in: [gauntlet/src/facts/check-governance-facts.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L55)

The declared negativeControl fixture path, or `null` when the check declares none.
