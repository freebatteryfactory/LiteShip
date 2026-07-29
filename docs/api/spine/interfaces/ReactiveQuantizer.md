[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / ReactiveQuantizer

# Interface: ReactiveQuantizer\<B\>

Defined in: [\_spine/core.d.ts:1010](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1010)

Reactive quantizer — the [Quantizer](Quantizer.md) base plus its reactive substrate on
the extracted [CellKernel](../namespaces/CellKernel/README.md). This is the shape `@liteship/quantizer`'s live
evaluator produces; a purely-synchronous quantizer omits this extension.

## Extends

- [`Quantizer`](Quantizer.md)\<`B`\>

## Extended by

- [`AnimatedQuantizer`](AnimatedQuantizer.md)
- [`LiveQuantizer`](LiveQuantizer.md)

## Type Parameters

### B

`B` *extends* [`Boundary`](Boundary.md) = [`Boundary`](Boundary.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"Quantizer"`

Defined in: [\_spine/core.d.ts:978](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L978)

#### Inherited from

[`Quantizer`](Quantizer.md).[`_tag`](Quantizer.md#_tag)

***

### boundary

> `readonly` **boundary**: `B`

Defined in: [\_spine/core.d.ts:979](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L979)

#### Inherited from

[`Quantizer`](Quantizer.md).[`boundary`](Quantizer.md#boundary)

***

### changes

> `readonly` **changes**: [`QuantizerCrossings`](../type-aliases/QuantizerCrossings.md)\<`B`\>

Defined in: [\_spine/core.d.ts:1012](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1012)

***

### state

> `readonly` **state**: [`QuantizerState`](../type-aliases/QuantizerState.md)\<`B`\>

Defined in: [\_spine/core.d.ts:1011](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1011)

***

### stateSync?

> `readonly` `optional` **stateSync?**: () => [`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

Defined in: [\_spine/core.d.ts:981](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L981)

Synchronous state accessor for hot paths (avoids reactive read overhead).

#### Returns

[`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

#### Inherited from

[`Quantizer`](Quantizer.md).[`stateSync`](Quantizer.md#statesync)

## Methods

### evaluate()

> **evaluate**(`value`): [`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

Defined in: [\_spine/core.d.ts:982](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L982)

#### Parameters

##### value

`number`

#### Returns

[`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

#### Inherited from

[`Quantizer`](Quantizer.md).[`evaluate`](Quantizer.md#evaluate)
