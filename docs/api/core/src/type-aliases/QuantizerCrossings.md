[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / QuantizerCrossings

# Type Alias: QuantizerCrossings\<B\>

> **QuantizerCrossings**\<`B`\> = `Pick`\<[`Fanout`](../namespaces/CellKernel/type-aliases/Fanout.md)\<[`BoundaryCrossing`](BoundaryCrossing.md)\<[`StateUnion`](StateUnion.md)\<`B`\> & `string`\>\>, `"subscribe"` \| `"closed"` \| `"size"`\>

Defined in: [core/src/schema/quantizer-types.ts:59](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/quantizer-types.ts#L59)

Crossing subscription surface — the no-replay [CellKernel](../variables/CellKernel.md) fan-out side.
`subscribe(sink)` registers a crossing listener and returns its disposer; a
late subscriber never sees a prior crossing. Replaces the former
`Stream.Stream<BoundaryCrossing<StateUnion<B> & string>>` changes.

## Type Parameters

### B

`B` *extends* [`Boundary`](Boundary.md) = [`Boundary`](Boundary.md)
