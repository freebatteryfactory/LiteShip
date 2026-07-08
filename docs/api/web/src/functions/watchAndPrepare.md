[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / watchAndPrepare

# Function: watchAndPrepare()

> **watchAndPrepare**(`marker`, `target`): [`WatchAndPrepareHandle`](../interfaces/WatchAndPrepareHandle.md)

Defined in: [web/src/dpu/watch-and-prepare.ts:167](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L167)

Watch a DOM slot under `marker` and prepare stamped verifiable patches against it.
The target is annotated with `data-czap-dpu-marker` immediately; successful applies
also stamp base/result ids and the fragment digest on the element.

## Parameters

### marker

`string`

### target

`Element`

## Returns

[`WatchAndPrepareHandle`](../interfaces/WatchAndPrepareHandle.md)
