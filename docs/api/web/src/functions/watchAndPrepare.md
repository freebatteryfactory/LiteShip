[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / watchAndPrepare

# Function: watchAndPrepare()

> **watchAndPrepare**(`marker`, `target`): [`WatchAndPrepareHandle`](../interfaces/WatchAndPrepareHandle.md)

Defined in: [web/src/dpu/watch-and-prepare.ts:278](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L278)

Watch a DOM slot under `marker` and prepare stamped verifiable patches against it.
The target is annotated with `data-liteship-dpu-marker` immediately; successful applies
also stamp base/result ids and the applied-DOM digest on the element.

Throws when `marker` is already watched on a DIFFERENT connected element —
duplicate live markers are a wiring bug, not a condition to launder. Call
`dispose()` on the previous handle (or disconnect its element) first.

## Parameters

### marker

`string`

### target

`Element`

## Returns

[`WatchAndPrepareHandle`](../interfaces/WatchAndPrepareHandle.md)
