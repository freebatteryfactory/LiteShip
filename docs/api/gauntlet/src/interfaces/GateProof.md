[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / GateProof

# Interface: GateProof

Defined in: [gauntlet/src/authority.ts:27](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/authority.ts#L27)

The evidence a gate produced by running against its own fixtures.

## Properties

### gateId

> `readonly` **gateId**: `string`

Defined in: [gauntlet/src/authority.ts:28](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/authority.ts#L28)

***

### greenClean

> `readonly` **greenClean**: `boolean`

Defined in: [gauntlet/src/authority.ts:32](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/authority.ts#L32)

Did the green (known-good) fixture produce 0 findings?

***

### mutationKilled

> `readonly` **mutationKilled**: `boolean`

Defined in: [gauntlet/src/authority.ts:34](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/authority.ts#L34)

Did mutating the gate's logic make its fixtures fail (mutation killed)?

***

### redCaught

> `readonly` **redCaught**: `boolean`

Defined in: [gauntlet/src/authority.ts:30](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/authority.ts#L30)

Did the red (known-bad) fixture produce ≥1 finding?

***

### selfProven

> `readonly` **selfProven**: `boolean`

Defined in: [gauntlet/src/authority.ts:36](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/authority.ts#L36)

Fully self-proven iff all three hold.
