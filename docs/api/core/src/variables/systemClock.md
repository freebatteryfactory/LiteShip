[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / systemClock

# Variable: systemClock

> `const` **systemClock**: [`Clock`](../interfaces/Clock.md)

Defined in: [core/src/clock.ts:59](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/clock.ts#L59)

The sanctioned MONOTONIC time read — for DURATIONS, never timestamps.

Prefers `performance.now()` (monotonic, sub-millisecond, process-relative) and
falls back to `Date.now()` only where `performance` is stripped (some workers /
SSR). Use this for elapsed-time deltas: rate estimation, throttle windows,
velocity history, frame pacing. **Its reading is NOT epoch milliseconds** — do
NOT feed it into a `new Date(...)`, an ISO stamp, or an HLC `wall_ms`; those
need [wallClock](wallClock.md). One of the two declared entropy boundaries (the other is
[wallClock](wallClock.md)); the no-nondeterminism gate flags its `Date.now()` fallback
and it is explicitly waived. Every runtime duration path reads through an
injected [Clock](../interfaces/Clock.md) defaulting here.
