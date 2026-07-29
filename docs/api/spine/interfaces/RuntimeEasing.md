[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / RuntimeEasing

# Interface: RuntimeEasing

Defined in: [\_spine/core.d.ts:1380](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1380)

Serializable easing descriptor consumed by runtime write plans.

## Properties

### kind

> `readonly` **kind**: `"linear"` \| `"ease"` \| `"spring"` \| `"points"` \| `"bounce"` \| `"elastic"` \| `"back"` \| `"cubicBezier"`

Defined in: [\_spine/core.d.ts:1381](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1381)

***

### points?

> `readonly` `optional` **points?**: readonly `number`[]

Defined in: [\_spine/core.d.ts:1387](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1387)

***

### spring?

> `readonly` `optional` **spring?**: `object`

Defined in: [\_spine/core.d.ts:1382](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1382)

#### damping?

> `readonly` `optional` **damping?**: `number`

#### mass?

> `readonly` `optional` **mass?**: `number`

#### stiffness?

> `readonly` `optional` **stiffness?**: `number`
