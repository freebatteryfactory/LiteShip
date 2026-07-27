[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / watchAndPrepare

# Function: watchAndPrepare()

> **watchAndPrepare**(`marker`, `target`): [`WatchAndPrepareHandle`](../interfaces/WatchAndPrepareHandle.md)

Defined in: web/dist/watch-and-prepare.d.ts:148

Watch a DOM slot under `marker` and prepare stamped verifiable patches against it.
The target is annotated with `data-liteship-dpu-marker` immediately; successful applies
also stamp base/result ids and the applied-DOM digest on the element.

Throws when `marker` is already watched on a DIFFERENT connected element —
duplicate live markers are a wiring bug, not a condition to launder. Call
`await dispose()` on the previous handle (or disconnect its element) first.

## Parameters

### marker

`string`

### target

`Element`

## Returns

[`WatchAndPrepareHandle`](../interfaces/WatchAndPrepareHandle.md)
