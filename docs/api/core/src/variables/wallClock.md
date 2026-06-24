[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / wallClock

# Variable: wallClock

> `const` **wallClock**: [`Clock`](../interfaces/Clock.md)

Defined in: [core/src/clock.ts:76](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/clock.ts#L76)

The sanctioned WALL-CLOCK read — epoch milliseconds, for TIMESTAMPS.

`Date.now()` — epoch ms. Use this wherever the value must be a real point in
time: an HLC `wall_ms` (which the protocol defines as `≈ Date.now()`), an
ISO receipt timestamp (`new Date(wallClock.now()).toISOString()`), a
time-range activation check, or an absolute-time signal value. **Not monotonic**
— it can jump with NTP/DST; for elapsed durations use [systemClock](systemClock.md). The
second of the two declared entropy boundaries; the no-nondeterminism gate flags
its `Date.now()` read and it is explicitly waived. Every runtime timestamp path
reads through an injected [Clock](../interfaces/Clock.md) defaulting here, so a test passing a
[fixedClock](../functions/fixedClock.md) gets stable timestamps and replayable HLC ordering.
