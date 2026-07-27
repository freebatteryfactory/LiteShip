[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / Clock

# Interface: Clock

Defined in: [\_spine/core.d.ts:702](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L702)

A monotonic-ish millisecond time source — the injectable shape runtime time is
read through (mirrors `@liteship/core`'s `clock.ts` export). `now()` returns
milliseconds, a relative duration source (deltas), never a stable identity
input to a hashed artifact. Threaded through [Zap.throttle](../namespaces/Zap/functions/throttle.md) so the
throttle window is measured deterministically under an injected clock, defaulting
to the runtime's `systemClock` (the monotonic `performance.now` boundary).

## Properties

### now

> `readonly` **now**: () => `number`

Defined in: [\_spine/core.d.ts:704](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L704)

Current time in milliseconds.

#### Returns

`number`
