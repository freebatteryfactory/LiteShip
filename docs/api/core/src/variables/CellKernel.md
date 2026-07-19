[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / CellKernel

# Variable: CellKernel

> `const` **CellKernel**: `object`

Defined in: [core/src/cell-kernel.ts:449](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts#L449)

CellKernel — the replay-current / fan-out reactive substrate. `replay1` mirrors
the compositor's replay-1 seam (current slot + replay-on-subscribe); `fanout`
is the strictly-simpler no-replay channel.

## Type Declaration

### fanout

> **fanout**: \<`T`\>(`policy`) => [`CellFanoutShape`](../interfaces/CellFanoutShape.md)\<`T`\>

Build a no-replay fan-out kernel. `policy` defaults to `{all}` (no dedup).

#### Type Parameters

##### T

`T`

#### Parameters

##### policy?

[`EmissionPolicy`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts)\<`T`\> = `EMIT_ALL`

#### Returns

[`CellFanoutShape`](../interfaces/CellFanoutShape.md)\<`T`\>

### replay1

> **replay1**: \<`T`\>(`initial`, `policy`, `reentrancy`) => [`CellReplayShape`](../interfaces/CellReplayShape.md)\<`T`\>

Build a replay-1 kernel seeded with `initial`. `policy` defaults to `{all}`
(no dedup) and `reentrancy` to `'synchronous'` (the pinned I5 nested fan-out),
so `replay1(initial)` is byte-for-byte the compositor extraction target.

#### Type Parameters

##### T

`T`

#### Parameters

##### initial

`T`

##### policy?

[`EmissionPolicy`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts)\<`T`\> = `EMIT_ALL`

##### reentrancy?

[`ReentrancyPolicy`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/cell-kernel.ts) = `'synchronous'`

#### Returns

[`CellReplayShape`](../interfaces/CellReplayShape.md)\<`T`\>
