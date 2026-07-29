[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [detect/src](../README.md) / CAP\_AXES

# Variable: CAP\_AXES

> `const` **CAP\_AXES**: readonly \[`"tier"`, `"motion"`, `"design"`\]

Defined in: [detect/src/cap-axes.ts:25](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/cap-axes.ts#L25)

The capability axes, in emit order. The single source of truth: the edge
emitter, `Astro.locals.liteship.tiers`, and the runtime readers all project from
this list, so their names can never drift apart.
