[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Rng

# Interface: Rng

Defined in: [core/src/rng.ts:28](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/rng.ts#L28)

A uniform random source in `[0, 1)` — the one shape randomness is read through.
Mirrors `Math.random()`'s contract so it is a drop-in at every call site.

## Properties

### next

> `readonly` **next**: () => `number`

Defined in: [core/src/rng.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/rng.ts#L30)

The next uniform draw in `[0, 1)`.

#### Returns

`number`
