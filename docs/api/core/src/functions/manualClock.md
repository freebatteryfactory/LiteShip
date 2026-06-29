[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / manualClock

# Function: manualClock()

> **manualClock**(`startMs?`): [`ManualClock`](../interfaces/ManualClock.md)

Defined in: [core/src/clock.ts:101](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/clock.ts#L101)

A manually-advanced clock — the caller drives time, so elapsed-time logic
(rate estimation, throttling, velocity history) becomes a deterministic
function of the advances the test makes. Starts at `startMs` (default 0).

## Parameters

### startMs?

`number` = `0`

## Returns

[`ManualClock`](../interfaces/ManualClock.md)
