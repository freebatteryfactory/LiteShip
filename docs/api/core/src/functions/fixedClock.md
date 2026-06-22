[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / fixedClock

# Function: fixedClock()

> **fixedClock**(`ms`): [`Clock`](../interfaces/Clock.md)

Defined in: [core/src/clock.ts:86](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/clock.ts#L86)

A frozen clock that always returns `ms` — for deterministic tests and replay.

Pure: the same `ms` always yields the same readings, so any computation that
threads this clock is fully reproducible.

## Parameters

### ms

`number`

## Returns

[`Clock`](../interfaces/Clock.md)
