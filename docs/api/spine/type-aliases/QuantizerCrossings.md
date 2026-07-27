[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / QuantizerCrossings

# Type Alias: QuantizerCrossings\<B\>

> **QuantizerCrossings**\<`B`\> = `Pick`\<[`Fanout`](../namespaces/CellKernel/interfaces/Fanout.md)\<[`BoundaryCrossing`](BoundaryCrossing.md)\<[`StateUnion`](StateUnion.md)\<`B`\> & `string`\>\>, `"subscribe"` \| `"closed"` \| `"size"`\>

Defined in: [\_spine/core.d.ts:999](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L999)

No-replay crossing subscription side (was
`Stream.Stream<BoundaryCrossing<StateUnion<B> & string>>`): a late subscriber
never sees a prior crossing.

## Type Parameters

### B

`B` *extends* [`Boundary`](../interfaces/Boundary.md) = [`Boundary`](../interfaces/Boundary.md)
