[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/reactive](../README.md) / createLiveCell

# Function: createLiveCell()

> **createLiveCell**\<`K`, `T`\>(`kind`, `initial`, `clock?`): `LiveCellShape`\<`K`, `T`\> & [`AsyncOwnedResource`](../interfaces/AsyncOwnedResource.md)

Defined in: core/dist/reactive/live-cell.d.ts:70

Wrap an arbitrary value in a [LiveCell](../type-aliases/LiveCell.md) with freshly minted identity + HLC.
The live cell IS its own disposable ([AsyncOwnedResource](../interfaces/AsyncOwnedResource.md)) — awaiting
`lc.dispose()` closes the value kernel + crossings channel exactly once. `clock`
(default `wallClock`) is the injected time source for the envelope HLC —
pass a `manualClock`/`fixedClock` for deterministic replay.

## Type Parameters

### K

`K` *extends* [`CellKind`](../../schema/type-aliases/CellKind.md)

### T

`T`

## Parameters

### kind

`K`

### initial

`T`

### clock?

[`Clock`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/Clock.md)

## Returns

`LiveCellShape`\<`K`, `T`\> & [`AsyncOwnedResource`](../interfaces/AsyncOwnedResource.md)
