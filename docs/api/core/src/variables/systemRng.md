[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / systemRng

# Variable: systemRng

> `const` **systemRng**: [`Rng`](../interfaces/Rng.md)

Defined in: [core/src/internal/rng.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/internal/rng.ts#L38)

The single sanctioned `Math.random()` read — the **declared entropy boundary**
for runtime randomness. The ONLY ambient-randomness read in the runtime; every
other path reads through an injected [Rng](../interfaces/Rng.md) defaulting here.
