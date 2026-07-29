[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [gauntlet/src](../README.md) / SimulationFaultFact

# Interface: SimulationFaultFact

Defined in: [gauntlet/src/facts/simulation-facts.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/simulation-facts.ts#L74)

A serialized fault-table entry carried across the host/lean-engine seam.

## Properties

### delayTicks?

> `readonly` `optional` **delayTicks?**: `number`

Defined in: [gauntlet/src/facts/simulation-facts.ts:78](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/simulation-facts.ts#L78)

***

### detail?

> `readonly` `optional` **detail?**: `string`

Defined in: [gauntlet/src/facts/simulation-facts.ts:79](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/simulation-facts.ts#L79)

***

### kind

> `readonly` **kind**: `"error"` \| `"drop"` \| `"delay"` \| `"reorder"`

Defined in: [gauntlet/src/facts/simulation-facts.ts:76](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/simulation-facts.ts#L76)

***

### point

> `readonly` **point**: `string`

Defined in: [gauntlet/src/facts/simulation-facts.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/simulation-facts.ts#L75)

***

### probability

> `readonly` **probability**: `number`

Defined in: [gauntlet/src/facts/simulation-facts.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/facts/simulation-facts.ts#L77)
