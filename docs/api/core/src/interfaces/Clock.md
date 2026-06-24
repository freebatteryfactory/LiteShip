[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Clock

# Interface: Clock

Defined in: [core/src/clock.ts:41](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/clock.ts#L41)

A monotonic-ish millisecond time source — the one shape time is read through.

`now()` returns milliseconds. Implementations backed by `performance.now()` are
monotonic and sub-millisecond; implementations backed by `Date.now()` are
wall-clock and integer. Callers must treat the value as a relative duration
source (deltas), never as a stable identity input to a hashed artifact.

## Extended by

- [`ManualClock`](ManualClock.md)

## Properties

### now

> `readonly` **now**: () => `number`

Defined in: [core/src/clock.ts:43](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/clock.ts#L43)

Current time in milliseconds.

#### Returns

`number`
