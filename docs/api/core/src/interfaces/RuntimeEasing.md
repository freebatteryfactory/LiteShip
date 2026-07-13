[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / RuntimeEasing

# Interface: RuntimeEasing

Defined in: [core/src/easing.ts:361](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/easing.ts#L361)

Self-describing easing descriptor carried in the runtime motion plan
(`RuntimeWritePlan.easing`) so the JS floor is driver-independent: it reads its
own curve rather than being handed one. `kind` mirrors the authoring
vocabulary (`'linear' | 'ease' | 'spring'`); `spring` carries the physics
config for the spring arm (defaulting to [DEFAULT\_MOTION\_SPRING](../variables/DEFAULT_MOTION_SPRING.md)).

## Properties

### kind

> `readonly` **kind**: `"linear"` \| `"ease"` \| `"spring"`

Defined in: [core/src/easing.ts:362](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/easing.ts#L362)

***

### spring?

> `readonly` `optional` **spring?**: `SpringConfigShape`

Defined in: [core/src/easing.ts:363](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/easing.ts#L363)
