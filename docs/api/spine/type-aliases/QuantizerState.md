[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / QuantizerState

# Type Alias: QuantizerState\<B\>

> **QuantizerState**\<`B`\> = `Pick`\<[`Replay`](../namespaces/CellKernel/interfaces/Replay.md)\<[`StateUnion`](StateUnion.md)\<`B`\>\>, `"read"` \| `"subscribe"` \| `"closed"` \| `"size"`\>

Defined in: [\_spine/core.d.ts:989](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L989)

Replay-1 current-state read side (was `Effect.Effect<StateUnion<B>>`): `read()`
returns the current discrete state; a subscriber is replayed the current value
on attach.

## Type Parameters

### B

`B` *extends* [`Boundary`](../interfaces/Boundary.md) = [`Boundary`](../interfaces/Boundary.md)
