[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/schema](../README.md) / QuantizerState

# Type Alias: QuantizerState\<B\>

> **QuantizerState**\<`B`\> = `Pick`\<[`Replay`](../../reactive/namespaces/CellKernel/type-aliases/Replay.md)\<`StateUnion`\<`B`\>\>, `"read"` \| `"subscribe"` \| `"closed"` \| `"size"`\>

Defined in: core/dist/schema/quantizer-types.d.ts:47

Live current-state surface — the replay-1 [CellKernel](../../reactive/variables/CellKernel.md) read side.
`read()` returns the current discrete state; a subscriber is replayed the
current value on attach (the replay-1 contract). Replaces the former
`Effect.Effect<StateUnion<B>>` state accessor.

## Type Parameters

### B

`B` *extends* [`Boundary`](../../type-aliases/Boundary.md) = [`Boundary`](../../type-aliases/Boundary.md)
