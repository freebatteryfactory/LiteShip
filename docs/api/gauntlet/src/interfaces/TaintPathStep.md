[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / TaintPathStep

# Interface: TaintPathStep

Defined in: [gauntlet/src/facts/taint-facts.ts:117](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/taint-facts.ts#L117)

One step on the source→sink path — the symbol the value threaded through.

## Properties

### file

> `readonly` **file**: `string`

Defined in: [gauntlet/src/facts/taint-facts.ts:121](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/taint-facts.ts#L121)

The repo-relative file of this step.

***

### line

> `readonly` **line**: `number`

Defined in: [gauntlet/src/facts/taint-facts.ts:123](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/taint-facts.ts#L123)

1-based line of this step.

***

### via

> `readonly` **via**: `string`

Defined in: [gauntlet/src/facts/taint-facts.ts:119](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/taint-facts.ts#L119)

The symbol / expression the value was carried by at this step (human label).
