[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / CAP\_AXES

# Variable: CAP\_AXES

> `const` **CAP\_AXES**: readonly \[`"tier"`, `"motion"`, `"design"`\]

Defined in: [detect/src/cap-axes.ts:20](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/cap-axes.ts#L20)

The capability axes, in emit order. The single source of truth: the edge
emitter, `Astro.locals.czap.tiers`, and the runtime readers all project from
this list, so their names can never drift apart.
