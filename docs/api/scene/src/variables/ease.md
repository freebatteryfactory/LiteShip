[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [scene/src](../README.md) / ease

# Variable: ease

> `const` **ease**: `object`

Defined in: [scene/src/sugar/ease.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/scene/src/sugar/ease.ts#L60)

Named easing catalog. Closed set under the cap-the-catalog rule.

## Type Declaration

### bounce

> **bounce**: [`EaseFn`](../type-aliases/EaseFn.md)

Bounce ease — simulates a ball bouncing with diminishing rebounds.

### cubic

> **cubic**: [`EaseFn`](../type-aliases/EaseFn.md)

Smooth cubic hermite ease — zero derivatives at endpoints.

### spring

> **spring**: [`EaseFn`](../type-aliases/EaseFn.md)

Spring ease — overshoots past 1 then settles; models elastic rebound.

### stepped

> **stepped**: (`steps`) => [`EaseFn`](../type-aliases/EaseFn.md)

Factory: quantize t into `steps` discrete levels.

#### Parameters

##### steps

`number`

#### Returns

[`EaseFn`](../type-aliases/EaseFn.md)
