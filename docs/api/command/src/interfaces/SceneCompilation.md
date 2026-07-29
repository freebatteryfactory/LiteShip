[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [command/src](../README.md) / SceneCompilation

# Interface: SceneCompilation

Defined in: [command/src/registry.ts:270](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L270)

Host-projected facts from one real scene compilation.

## Properties

### durationMs

> `readonly` **durationMs**: `number`

Defined in: [command/src/registry.ts:272](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L272)

Resolved scene duration, including track-derived duration when authoring omitted it.

***

### fps

> `readonly` **fps**: `number`

Defined in: [command/src/registry.ts:274](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L274)

Validated output frame rate.

***

### trackCount

> `readonly` **trackCount**: `number`

Defined in: [command/src/registry.ts:276](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L276)

Number of compiled track spawns, not the unvalidated authoring-array length.
