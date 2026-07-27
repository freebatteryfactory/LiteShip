[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / QuantizerState

# Type Alias: QuantizerState\<B\>

> **QuantizerState**\<`B`\> = `Pick`\<[`Replay`](../namespaces/CellKernel/type-aliases/Replay.md)\<[`StateUnion`](StateUnion.md)\<`B`\>\>, `"read"` \| `"subscribe"` \| `"closed"` \| `"size"`\>

Defined in: [core/src/schema/quantizer-types.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/quantizer-types.ts#L50)

Live current-state surface — the replay-1 [CellKernel](../variables/CellKernel.md) read side.
`read()` returns the current discrete state; a subscriber is replayed the
current value on attach (the replay-1 contract). Replaces the former
`Effect.Effect<StateUnion<B>>` state accessor.

## Type Parameters

### B

`B` *extends* [`Boundary`](Boundary.md) = [`Boundary`](Boundary.md)
