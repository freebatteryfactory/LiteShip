[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / RafDebouncedTrigger

# Interface: RafDebouncedTrigger()

Defined in: [core/src/reactive/scheduler.ts:170](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/scheduler.ts#L170)

A coalescing trigger from [rafDebounce](../functions/rafDebounce.md): call to schedule, `.cancel()` to drop a pending frame.

> **RafDebouncedTrigger**(): `void`

Defined in: [core/src/reactive/scheduler.ts:172](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/scheduler.ts#L172)

Request a `callback` run on the next frame; repeated calls before it fires collapse to one.

## Returns

`void`

## Methods

### cancel()

> **cancel**(): `void`

Defined in: [core/src/reactive/scheduler.ts:174](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/scheduler.ts#L174)

Drop a pending coalesced frame, if any. Idempotent — safe to call repeatedly.

#### Returns

`void`
