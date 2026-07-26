[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / SceneCompilation

# Interface: SceneCompilation

Defined in: [command/src/registry.ts:278](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L278)

Host-projected facts from one real scene compilation.

## Properties

### durationMs

> `readonly` **durationMs**: `number`

Defined in: [command/src/registry.ts:280](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L280)

Resolved scene duration, including track-derived duration when authoring omitted it.

***

### fps

> `readonly` **fps**: `number`

Defined in: [command/src/registry.ts:282](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L282)

Validated output frame rate.

***

### trackCount

> `readonly` **trackCount**: `number`

Defined in: [command/src/registry.ts:284](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L284)

Number of compiled track spawns, not the unvalidated authoring-array length.
