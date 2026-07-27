[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / SceneCompilation

# Interface: SceneCompilation

Defined in: [\_spine/command.d.ts:171](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L171)

Host-projected facts from one real scene compilation.

## Properties

### durationMs

> `readonly` **durationMs**: `number`

Defined in: [\_spine/command.d.ts:173](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L173)

Resolved scene duration, including track-derived duration when authoring omitted it.

***

### fps

> `readonly` **fps**: `number`

Defined in: [\_spine/command.d.ts:175](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L175)

Validated output frame rate.

***

### trackCount

> `readonly` **trackCount**: `number`

Defined in: [\_spine/command.d.ts:177](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/command.d.ts#L177)

Number of compiled track spawns, not the unvalidated authoring-array length.
