[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / GateProof

# Interface: GateProof

Defined in: [gauntlet/src/authority.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/authority.ts#L29)

The evidence a gate produced by running against its own fixtures.

## Properties

### gateId

> `readonly` **gateId**: `string`

Defined in: [gauntlet/src/authority.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/authority.ts#L30)

***

### greenClean

> `readonly` **greenClean**: `boolean`

Defined in: [gauntlet/src/authority.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/authority.ts#L34)

Did the green (known-good) fixture produce 0 findings?

***

### mutationKilled

> `readonly` **mutationKilled**: `boolean`

Defined in: [gauntlet/src/authority.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/authority.ts#L36)

Did mutating the gate's logic make its fixtures fail (mutation killed)?

***

### redCaught

> `readonly` **redCaught**: `boolean`

Defined in: [gauntlet/src/authority.ts:32](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/authority.ts#L32)

Did the red (known-bad) fixture produce ≥1 finding?

***

### selfProven

> `readonly` **selfProven**: `boolean`

Defined in: [gauntlet/src/authority.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/authority.ts#L38)

Fully self-proven iff all three hold.
