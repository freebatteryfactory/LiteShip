[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / NegativeControlFact

# Interface: NegativeControlFact

Defined in: [gauntlet/src/facts/check-governance-facts.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L52)

One blocking (or advisory) check's negative-control verdict for `check-negative-control`.

The gate decides the PARTITION over the blocking checks: each blocking check must
be classified EXACTLY once — it EITHER declares a `negativeControl` that EXISTS
(a real red-fixture / regression-guard / self-proving gate) OR is `exempt` (with a
documented `exemptReason`). A blocking check that is NEITHER is an unclassified
partition hole; one that is BOTH breaks disjointness. A host folds each check's
declared path + on-disk existence + its `NEGATIVE_CONTROL_EXEMPT` membership here.

## Properties

### blocking

> `readonly` **blocking**: `boolean`

Defined in: [gauntlet/src/facts/check-governance-facts.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L56)

Whether this check holds blocking authority (only blocking checks are judged).

***

### exempt

> `readonly` **exempt**: `boolean`

Defined in: [gauntlet/src/facts/check-governance-facts.ts:62](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L62)

Whether this check is a key of `NEGATIVE_CONTROL_EXEMPT` (a documented planted-regression exemption).

***

### exemptReason

> `readonly` **exemptReason**: `string` \| `null`

Defined in: [gauntlet/src/facts/check-governance-facts.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L64)

The one-line exemption rationale when `exempt`, else `null`.

***

### exists

> `readonly` **exists**: `boolean`

Defined in: [gauntlet/src/facts/check-governance-facts.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L60)

Whether the declared negativeControl path EXISTS on disk (false when `negativeControl` is null).

***

### id

> `readonly` **id**: `string`

Defined in: [gauntlet/src/facts/check-governance-facts.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L54)

The check identity, `check/<slug>`.

***

### negativeControl

> `readonly` **negativeControl**: `string` \| `null`

Defined in: [gauntlet/src/facts/check-governance-facts.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/check-governance-facts.ts#L58)

The declared negativeControl fixture path, or `null` when the check declares none.
