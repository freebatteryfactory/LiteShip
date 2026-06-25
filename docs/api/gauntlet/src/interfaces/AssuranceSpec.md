[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / AssuranceSpec

# Interface: AssuranceSpec

Defined in: [gauntlet/src/assurance.ts:27](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/assurance.ts#L27)

Static description of what each level IS and the rigor it demands.

## Properties

### level

> `readonly` **level**: [`AssuranceLevel`](../type-aliases/AssuranceLevel.md)

Defined in: [gauntlet/src/assurance.ts:28](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/assurance.ts#L28)

***

### rank

> `readonly` **rank**: `number`

Defined in: [gauntlet/src/assurance.ts:30](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/assurance.ts#L30)

Ordinal for comparison (0 = L0 … 4 = L4).

***

### requires

> `readonly` **requires**: readonly `string`[]

Defined in: [gauntlet/src/assurance.ts:34](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/assurance.ts#L34)

The rigor a gate at this level is expected to bring (cumulative over lower levels).

***

### what

> `readonly` **what**: `string`

Defined in: [gauntlet/src/assurance.ts:32](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/assurance.ts#L32)

What kind of code lives here.
