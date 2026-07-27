[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / ReactiveQuantizer

# Interface: ReactiveQuantizer\<B\>

Defined in: [\_spine/core.d.ts:794](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L794)

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

Defined in: [\_spine/core.d.ts:762](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L762)

#### Inherited from

[`Quantizer`](Quantizer.md).[`_tag`](Quantizer.md#_tag)

***

### boundary

> `readonly` **boundary**: `B`

Defined in: [\_spine/core.d.ts:763](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L763)

#### Inherited from

[`Quantizer`](Quantizer.md).[`boundary`](Quantizer.md#boundary)

***

### changes

> `readonly` **changes**: [`QuantizerCrossings`](../type-aliases/QuantizerCrossings.md)\<`B`\>

Defined in: [\_spine/core.d.ts:796](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L796)

***

### state

> `readonly` **state**: [`QuantizerState`](../type-aliases/QuantizerState.md)\<`B`\>

Defined in: [\_spine/core.d.ts:795](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L795)

***

### stateSync?

> `readonly` `optional` **stateSync?**: () => [`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

Defined in: [\_spine/core.d.ts:765](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L765)

Synchronous state accessor for hot paths (avoids reactive read overhead).

#### Returns

[`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

#### Inherited from

[`Quantizer`](Quantizer.md).[`stateSync`](Quantizer.md#statesync)

## Methods

### evaluate()

> **evaluate**(`value`): [`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

Defined in: [\_spine/core.d.ts:766](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L766)

#### Parameters

##### value

`number`

#### Returns

[`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

#### Inherited from

[`Quantizer`](Quantizer.md).[`evaluate`](Quantizer.md#evaluate)
