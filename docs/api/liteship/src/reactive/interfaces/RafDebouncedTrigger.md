[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/reactive](../README.md) / RafDebouncedTrigger

# Interface: RafDebouncedTrigger()

Defined in: core/dist/reactive/scheduler.d.ts:58

A coalescing trigger from [rafDebounce](../functions/rafDebounce.md): call to schedule, `.cancel()` to drop a pending frame.

> **RafDebouncedTrigger**(): `void`

Defined in: core/dist/reactive/scheduler.d.ts:60

Request a `callback` run on the next frame; repeated calls before it fires collapse to one.

## Returns

`void`

## Methods

### cancel()

> **cancel**(): `void`

Defined in: core/dist/reactive/scheduler.d.ts:62

Drop a pending coalesced frame, if any. Idempotent — safe to call repeatedly.

#### Returns

`void`
