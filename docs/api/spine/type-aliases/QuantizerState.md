[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / QuantizerState

# Type Alias: QuantizerState\<B\>

> **QuantizerState**\<`B`\> = `Pick`\<[`Replay`](../namespaces/CellKernel/interfaces/Replay.md)\<[`StateUnion`](StateUnion.md)\<`B`\>\>, `"read"` \| `"subscribe"` \| `"closed"` \| `"size"`\>

Defined in: [\_spine/core.d.ts:990](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L990)

Replay-1 current-state read side (was `Effect.Effect<StateUnion<B>>`): `read()`
returns the current discrete state; a subscriber is replayed the current value
on attach.

## Type Parameters

### B

`B` *extends* [`Boundary`](../interfaces/Boundary.md) = [`Boundary`](../interfaces/Boundary.md)
