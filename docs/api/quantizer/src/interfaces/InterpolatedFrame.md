[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / InterpolatedFrame

# Interface: InterpolatedFrame\<B\>

Defined in: [quantizer/src/animated-quantizer.ts:25](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/animated-quantizer.ts#L25)

An interpolated animation frame emitted during a crossing.

## Type Parameters

### B

`B` *extends* [`Boundary`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/Boundary.md)

## Properties

### outputs

> `readonly` **outputs**: `Record`\<`string`, `number` \| `string`\>

Defined in: [quantizer/src/animated-quantizer.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/animated-quantizer.ts#L31)

Interpolated output record for the current frame.

***

### progress

> `readonly` **progress**: `number`

Defined in: [quantizer/src/animated-quantizer.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/animated-quantizer.ts#L29)

Progress in `[0, 1]`, where `1` means the animation has landed.

***

### state

> `readonly` **state**: `StateUnion`\<`B`\>

Defined in: [quantizer/src/animated-quantizer.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/animated-quantizer.ts#L27)

Target state of the in-flight transition.
