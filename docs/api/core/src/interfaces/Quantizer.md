[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Quantizer

# Interface: Quantizer\<B\>

Defined in: [core/src/quantizer-types.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/quantizer-types.ts#L34)

Quantizer contract — the SYNCHRONOUS base: a [Boundary](../variables/Boundary.md) definition, its
`evaluate` transition, and an optional synchronous state accessor for hot
paths. The reactive machinery (a current-state read and a crossing
subscription) is layered on by [ReactiveQuantizer](ReactiveQuantizer.md); a consumer that only
evaluates and reads `stateSync` never touches the reactive substrate.

The concrete reactive implementation is produced by `@liteship/quantizer`'s
`Q.from()` builder (a [ReactiveQuantizer](ReactiveQuantizer.md)); consumers interact only via
these structural interfaces.

## Extended by

- [`ReactiveQuantizer`](ReactiveQuantizer.md)

## Type Parameters

### B

`B` *extends* [`Shape`](../namespaces/Boundary/type-aliases/Shape.md) = [`Shape`](../namespaces/Boundary/type-aliases/Shape.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"Quantizer"`

Defined in: [core/src/quantizer-types.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/quantizer-types.ts#L35)

***

### boundary

> `readonly` **boundary**: `B`

Defined in: [core/src/quantizer-types.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/quantizer-types.ts#L36)

***

### stateSync?

> `readonly` `optional` **stateSync?**: () => [`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

Defined in: [core/src/quantizer-types.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/quantizer-types.ts#L38)

Synchronous state accessor for hot paths (avoids reactive read overhead).

#### Returns

[`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

## Methods

### evaluate()

> **evaluate**(`value`): [`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

Defined in: [core/src/quantizer-types.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/quantizer-types.ts#L39)

#### Parameters

##### value

`number`

#### Returns

[`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>
