[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / rafDebounce

# Function: rafDebounce()

> **rafDebounce**(`callback`): [`RafDebouncedTrigger`](../interfaces/RafDebouncedTrigger.md)

Defined in: [core/src/reactive/scheduler.ts:186](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/scheduler.ts#L186)

Coalesce a burst of calls into ONE `callback` run per animation frame — the
rAF-throttle idiom every scroll/resize listener hand-rolled. Calling the returned
trigger any number of times before the next frame fires `callback` exactly once on
that frame; the trigger carries a `cancel()` that drops a pending frame.

Where `requestAnimationFrame` is absent (SSR / Node / worker), it falls back to
`setTimeout(…, 0)`, so the once-per-tick coalescing contract still holds off the
browser loop.

## Parameters

### callback

() => `void`

## Returns

[`RafDebouncedTrigger`](../interfaces/RafDebouncedTrigger.md)
