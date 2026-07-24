[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / InterpolatedFrame

# Interface: InterpolatedFrame\<B\>

Defined in: [quantizer/src/animated-quantizer.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/animated-quantizer.ts#L34)

An interpolated animation frame emitted during a crossing.

## Type Parameters

### B

`B` *extends* [`Boundary`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/Boundary.md)

## Properties

### outputs

> `readonly` **outputs**: `Record`\<`string`, `number` \| `string`\>

Defined in: [quantizer/src/animated-quantizer.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/animated-quantizer.ts#L40)

Interpolated output record for the current frame.

***

### progress

> `readonly` **progress**: `number`

Defined in: [quantizer/src/animated-quantizer.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/animated-quantizer.ts#L38)

Progress in `[0, 1]`, where `1` means the animation has landed.

***

### state

> `readonly` **state**: `StateUnion`\<`B`\>

Defined in: [quantizer/src/animated-quantizer.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/quantizer/src/animated-quantizer.ts#L36)

Target state of the in-flight transition.
