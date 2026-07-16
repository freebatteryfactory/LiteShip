[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / CellKernel

# Variable: CellKernel

> `const` **CellKernel**: `object`

Defined in: [core/src/cell-kernel.ts:240](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L240)

CellKernel — the replay-current / fan-out reactive substrate. `replay1` mirrors
the compositor's replay-1 seam (current slot + replay-on-subscribe); `fanout`
is the strictly-simpler no-replay channel.

## Type Declaration

### fanout

> **fanout**: \<`T`\>() => [`CellFanoutShape`](../interfaces/CellFanoutShape.md)\<`T`\>

Build a no-replay fan-out kernel.

#### Type Parameters

##### T

`T`

#### Returns

[`CellFanoutShape`](../interfaces/CellFanoutShape.md)\<`T`\>

### replay1

> **replay1**: \<`T`\>(`initial`) => [`CellReplayShape`](../interfaces/CellReplayShape.md)\<`T`\>

Build a replay-1 kernel seeded with `initial`.

#### Type Parameters

##### T

`T`

#### Parameters

##### initial

`T`

#### Returns

[`CellReplayShape`](../interfaces/CellReplayShape.md)\<`T`\>
