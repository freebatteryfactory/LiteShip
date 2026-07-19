[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / seededRng

# Function: seededRng()

> **seededRng**(`seed`): [`Rng`](../interfaces/Rng.md)

Defined in: [core/src/internal/rng.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/internal/rng.ts#L49)

A seeded, deterministic RNG (mulberry32) — for tests and replayable runs.

A fast, well-distributed 32-bit generator. The same `seed` always produces the
same stream, so any computation that threads this RNG is fully reproducible.
Not cryptographically secure — determinism, not unpredictability, is the goal.

## Parameters

### seed

`number`

## Returns

[`Rng`](../interfaces/Rng.md)
