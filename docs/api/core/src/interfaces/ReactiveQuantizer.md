[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ReactiveQuantizer

# Interface: ReactiveQuantizer\<B\>

Defined in: [core/src/schema/quantizer-types.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/quantizer-types.ts#L71)

Reactive quantizer — the [Quantizer](Quantizer.md) base plus its reactive substrate: a
replay-1 current-state read and a no-replay crossing subscription, both on the
extracted [CellKernel](../variables/CellKernel.md). This is the shape `@liteship/quantizer`'s live
evaluator produces; a purely-synchronous quantizer omits this extension.

## Extends

- [`Quantizer`](Quantizer.md)\<`B`\>

## Type Parameters

### B

`B` *extends* [`Boundary`](../type-aliases/Boundary.md) = [`Boundary`](../type-aliases/Boundary.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"Quantizer"`

Defined in: [core/src/schema/quantizer-types.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/quantizer-types.ts#L36)

#### Inherited from

[`Quantizer`](Quantizer.md).[`_tag`](Quantizer.md#_tag)

***

### boundary

> `readonly` **boundary**: `B`

Defined in: [core/src/schema/quantizer-types.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/quantizer-types.ts#L37)

#### Inherited from

[`Quantizer`](Quantizer.md).[`boundary`](Quantizer.md#boundary)

***

### changes

> `readonly` **changes**: [`QuantizerCrossings`](../type-aliases/QuantizerCrossings.md)\<`B`\>

Defined in: [core/src/schema/quantizer-types.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/quantizer-types.ts#L75)

No-replay crossing subscription (was `Stream.Stream<BoundaryCrossing<StateUnion<B> & string>>`).

***

### state

> `readonly` **state**: [`QuantizerState`](../type-aliases/QuantizerState.md)\<`B`\>

Defined in: [core/src/schema/quantizer-types.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/quantizer-types.ts#L73)

Replay-1 current-state read (was `Effect.Effect<StateUnion<B>>`).

***

### stateSync?

> `readonly` `optional` **stateSync?**: () => [`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

Defined in: [core/src/schema/quantizer-types.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/quantizer-types.ts#L39)

Synchronous state accessor for hot paths (avoids reactive read overhead).

#### Returns

[`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

#### Inherited from

[`Quantizer`](Quantizer.md).[`stateSync`](Quantizer.md#statesync)

## Methods

### evaluate()

> **evaluate**(`value`): [`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

Defined in: [core/src/schema/quantizer-types.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/quantizer-types.ts#L40)

#### Parameters

##### value

`number`

#### Returns

[`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

#### Inherited from

[`Quantizer`](Quantizer.md).[`evaluate`](Quantizer.md#evaluate)
