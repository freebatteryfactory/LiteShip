[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / CompositorQuantizer

# Type Alias: CompositorQuantizer\<B\>

> **CompositorQuantizer**\<`B`\> = [`Quantizer`](../interfaces/Quantizer.md)\<`B`\> & `object` \| [`ReactiveQuantizer`](../interfaces/ReactiveQuantizer.md)\<`B`\>

Defined in: [core/src/schema/quantizer-types.ts:88](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/quantizer-types.ts#L88)

A quantizer the [Compositor](../namespaces/Compositor/README.md) can drive: it must be able to produce its
current discrete state, EITHER synchronously (a REQUIRED [Quantizer.stateSync](../interfaces/Quantizer.md#statesync))
OR reactively (a full [ReactiveQuantizer](../interfaces/ReactiveQuantizer.md) with `state.read()`). The bare
[Quantizer](../interfaces/Quantizer.md) base — no `stateSync`, no reactive `state` — is deliberately
rejected: `Compositor.add` reads the state during its initial `compute-discrete`
pass, so a base-only quantizer would crash at runtime. Encoding the requirement
in the accepted type turns that into a compile-time error instead (the base
`Quantizer` contract is public, so a consumer could otherwise satisfy it and fail).

## Type Parameters

### B

`B` *extends* [`Boundary`](Boundary.md) = [`Boundary`](Boundary.md)
