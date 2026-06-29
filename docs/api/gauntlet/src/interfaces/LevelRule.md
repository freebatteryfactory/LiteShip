[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / LevelRule

# Interface: LevelRule

Defined in: [gauntlet/src/assurance-map.ts:26](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/assurance-map.ts#L26)

One rule of the assurance map: paths matching `glob` are at `level`.

## Properties

### glob

> `readonly` **glob**: `string`

Defined in: [gauntlet/src/assurance-map.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/assurance-map.ts#L28)

A repo-relative glob (dialect: `**`, `*`, `{a,b}` alternation only).

***

### level

> `readonly` **level**: [`AssuranceLevel`](../type-aliases/AssuranceLevel.md)

Defined in: [gauntlet/src/assurance-map.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/assurance-map.ts#L30)

The assurance level paths matching [glob](#glob) carry.
