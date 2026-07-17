[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / RuntimeEasing

# Interface: RuntimeEasing

Defined in: [core/src/easing.ts:387](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/easing.ts#L387)

Self-describing easing descriptor carried in the runtime motion plan
(`RuntimeWritePlan.easing`) so the JS floor is driver-independent: it reads its
own curve rather than being handed one. `kind` mirrors the authoring
vocabulary (`'linear' | 'ease' | 'spring'`); `spring` carries the physics
config for the spring arm (defaulting to [DEFAULT\_MOTION\_SPRING](../variables/DEFAULT_MOTION_SPRING.md)).

## Properties

### kind

> `readonly` **kind**: `"linear"` \| `"ease"` \| `"spring"` \| `"points"` \| `"bounce"` \| `"elastic"` \| `"back"` \| `"cubicBezier"`

Defined in: [core/src/easing.ts:388](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/easing.ts#L388)

***

### points?

> `readonly` `optional` **points?**: readonly `number`[]

Defined in: [core/src/easing.ts:399](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/easing.ts#L399)

Serialized sampled point list (Law 4, the byte-law): the IDENTICAL `linear()` stops
the native CSS path emits via `Easing.easingToLinearCSS`. When present the floor lerps
THIS list piecewise-linearly rather than re-deriving the curve — ONE producer, both
floors read it, so a browser scrubbing the JS floor and a browser running native
`linear(...)` land on one value at every `t`. Carried by the `'points'` kind and by
any widened-catalog kind (`bounce`/`elastic`/`back`/`cubicBezier`) whose curve was
serialized. The legacy `linear`/`ease`/`spring` kinds sample analytically (no arm).

***

### spring?

> `readonly` `optional` **spring?**: `SpringConfigShape`

Defined in: [core/src/easing.ts:389](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/easing.ts#L389)
