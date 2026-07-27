[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / RuntimeEasing

# Interface: RuntimeEasing

Defined in: [\_spine/core.d.ts:1164](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1164)

Serializable easing descriptor consumed by runtime write plans.

## Properties

### kind

> `readonly` **kind**: `"linear"` \| `"ease"` \| `"spring"` \| `"points"` \| `"bounce"` \| `"elastic"` \| `"back"` \| `"cubicBezier"`

Defined in: [\_spine/core.d.ts:1165](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1165)

***

### points?

> `readonly` `optional` **points?**: readonly `number`[]

Defined in: [\_spine/core.d.ts:1171](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1171)

***

### spring?

> `readonly` `optional` **spring?**: `object`

Defined in: [\_spine/core.d.ts:1166](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1166)

#### damping?

> `readonly` `optional` **damping?**: `number`

#### mass?

> `readonly` `optional` **mass?**: `number`

#### stiffness?

> `readonly` `optional` **stiffness?**: `number`
