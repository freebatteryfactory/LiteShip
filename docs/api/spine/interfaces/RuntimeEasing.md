[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / RuntimeEasing

# Interface: RuntimeEasing

Defined in: [\_spine/core.d.ts:1379](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1379)

Serializable easing descriptor consumed by runtime write plans.

## Properties

### kind

> `readonly` **kind**: `"linear"` \| `"ease"` \| `"spring"` \| `"points"` \| `"bounce"` \| `"elastic"` \| `"back"` \| `"cubicBezier"`

Defined in: [\_spine/core.d.ts:1380](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1380)

***

### points?

> `readonly` `optional` **points?**: readonly `number`[]

Defined in: [\_spine/core.d.ts:1386](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1386)

***

### spring?

> `readonly` `optional` **spring?**: `object`

Defined in: [\_spine/core.d.ts:1381](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1381)

#### damping?

> `readonly` `optional` **damping?**: `number`

#### mass?

> `readonly` `optional` **mass?**: `number`

#### stiffness?

> `readonly` `optional` **stiffness?**: `number`
