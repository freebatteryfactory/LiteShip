[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / World

# Variable: World

> `const` **World**: `object`

Defined in: [core/src/ecs.ts:369](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ecs.ts#L369)

World namespace — construct the ECS world that ticks systems over entities.

## Type Declaration

### make

> **make**: () => `Effect`\<`WorldShape`, `never`, [`Scope`](https://effect-ts.github.io/effect/effect/Scope.ts.html)\> = `_makeWorld`

Scoped Effect that produces a fresh ECS [World.Shape](../namespaces/World/type-aliases/Shape.md).

#### Returns

`Effect`\<`WorldShape`, `never`, [`Scope`](https://effect-ts.github.io/effect/effect/Scope.ts.html)\>
