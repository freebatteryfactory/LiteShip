[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / World

# Variable: World

> `const` **World**: `object`

Defined in: [core/src/ecs.ts:347](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L347)

World namespace — construct the ECS world that ticks systems over entities.

## Type Declaration

### make

> **make**: () => `OwnedWorld` = `_makeWorld`

Build a fresh ECS World; the returned instance owns its own teardown.

#### Returns

`OwnedWorld`
