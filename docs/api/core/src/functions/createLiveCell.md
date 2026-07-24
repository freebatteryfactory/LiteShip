[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / createLiveCell

# Function: createLiveCell()

> **createLiveCell**\<`K`, `T`\>(`kind`, `initial`, `clock?`): `LiveCellShape`\<`K`, `T`\> & [`AsyncOwnedResource`](../interfaces/AsyncOwnedResource.md)

Defined in: [core/src/reactive/live-cell.ts:174](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/live-cell.ts#L174)

Wrap an arbitrary value in a [LiveCell](../type-aliases/LiveCell.md) with freshly minted identity + HLC.
The live cell IS its own disposable ([AsyncOwnedResource](../interfaces/AsyncOwnedResource.md)) — awaiting
`lc.dispose()` closes the value kernel + crossings channel exactly once. `clock`
(default [wallClock](../variables/wallClock.md)) is the injected time source for the envelope HLC —
pass a `manualClock`/`fixedClock` for deterministic replay.

## Type Parameters

### K

`K` *extends* [`CellKind`](../type-aliases/CellKind.md)

### T

`T`

## Parameters

### kind

`K`

### initial

`T`

### clock?

[`Clock`](../interfaces/Clock.md) = `wallClock`

## Returns

`LiveCellShape`\<`K`, `T`\> & [`AsyncOwnedResource`](../interfaces/AsyncOwnedResource.md)
