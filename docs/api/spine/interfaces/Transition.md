[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / Transition

# Interface: Transition\<B\>

Defined in: [\_spine/quantizer.d.ts:164](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L164)

One running transition between two states of a boundary.

## Type Parameters

### B

`B` *extends* [`Boundary`](Boundary.md)

## Properties

### config

> `readonly` **config**: [`TransitionMap`](../type-aliases/TransitionMap.md)\<[`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>\>

Defined in: [\_spine/quantizer.d.ts:165](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L165)

## Methods

### getTransition()

> **getTransition**(`from`, `to`): [`TransitionConfig`](TransitionConfig.md)

Defined in: [\_spine/quantizer.d.ts:166](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L166)

#### Parameters

##### from

[`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

##### to

[`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

#### Returns

[`TransitionConfig`](TransitionConfig.md)
