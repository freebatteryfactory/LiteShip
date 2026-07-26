[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/reactive](../README.md) / CellKernel

# Variable: CellKernel

> `const` **CellKernel**: `object`

Defined in: core/dist/reactive/cell-kernel.d.ts:153

CellKernel — the replay-current / fan-out reactive substrate. `replay1` mirrors
the compositor's replay-1 seam (current slot + replay-on-subscribe); `fanout`
is the strictly-simpler no-replay channel.

## Type Declaration

### fanout

> `readonly` **fanout**: *typeof* `fanout`

Build a no-replay fan-out kernel. `policy` defaults to `{all}` (no dedup).

### replay1

> `readonly` **replay1**: *typeof* `replay1`

Build a replay-1 kernel seeded with `initial`. `policy` defaults to `{all}`
(no dedup) and `reentrancy` to `'synchronous'` (the pinned I5 nested fan-out),
so `replay1(initial)` is byte-for-byte the compositor extraction target.
