[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [quantizer/src](../README.md) / Transition

# Interface: Transition\<B\>

Defined in: [quantizer/src/transition.ts:52](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/transition.ts#L52)

Resolver that maps a boundary crossing to its [TransitionConfig](TransitionConfig.md).

Produced by [Transition.for](../variables/Transition.md#for); consumed by [AnimatedQuantizer](../namespaces/AnimatedQuantizer/README.md)
during animation loop setup.

## Type Parameters

### B

`B` *extends* [`Boundary.Shape`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/namespaces/Boundary/type-aliases/Shape.md)

## Properties

### config

> `readonly` **config**: [`TransitionMap`](../type-aliases/TransitionMap.md)\<`StateUnion`\<`B`\>\>

Defined in: [quantizer/src/transition.ts:54](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/transition.ts#L54)

The raw transition map used to create this resolver.

## Methods

### getTransition()

> **getTransition**(`from`, `to`): [`TransitionConfig`](TransitionConfig.md)

Defined in: [quantizer/src/transition.ts:56](https://github.com/heyoub/LiteShip/blob/main/packages/quantizer/src/transition.ts#L56)

Resolve the transition config for a specific `from -> to` state pair.

#### Parameters

##### from

`StateUnion`\<`B`\>

##### to

`StateUnion`\<`B`\>

#### Returns

[`TransitionConfig`](TransitionConfig.md)
