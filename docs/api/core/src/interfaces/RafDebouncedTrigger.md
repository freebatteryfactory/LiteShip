[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / RafDebouncedTrigger

# Interface: RafDebouncedTrigger()

Defined in: [core/src/scheduler.ts:169](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/scheduler.ts#L169)

A coalescing trigger from [rafDebounce](../functions/rafDebounce.md): call to schedule, `.cancel()` to drop a pending frame.

> **RafDebouncedTrigger**(): `void`

Defined in: [core/src/scheduler.ts:171](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/scheduler.ts#L171)

Request a `callback` run on the next frame; repeated calls before it fires collapse to one.

## Returns

`void`

## Methods

### cancel()

> **cancel**(): `void`

Defined in: [core/src/scheduler.ts:173](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/scheduler.ts#L173)

Drop a pending coalesced frame, if any. Idempotent — safe to call repeatedly.

#### Returns

`void`
