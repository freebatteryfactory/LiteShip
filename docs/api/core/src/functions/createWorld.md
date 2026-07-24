[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / createWorld

# Function: createWorld()

> **createWorld**(): `OwnedWorld`

Defined in: [core/src/ecs.ts:210](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/ecs.ts#L210)

Build a fresh ECS [World](../type-aliases/World.md) — the entity/system container that ticks systems
over entities. The world IS its own disposable ([AsyncOwnedResource](../interfaces/AsyncOwnedResource.md)); the
owning [Lifetime](../variables/Lifetime.md) stays reachable as `world.lifetime` for advanced
composition (verb grammar, ADR-0046 — `create` allocates a runtime resource).

## Returns

`OwnedWorld`
