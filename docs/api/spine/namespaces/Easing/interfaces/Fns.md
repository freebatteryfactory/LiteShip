[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [\_spine](../../../README.md) / [Easing](../README.md) / Fns

# Interface: Fns

Defined in: [\_spine/core.d.ts:382](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L382)

## Properties

### ease

> `readonly` **ease**: [`Fn`](../type-aliases/Fn.md)

Defined in: [\_spine/core.d.ts:391](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L391)

***

### easeIn

> `readonly` **easeIn**: [`Fn`](../type-aliases/Fn.md)

Defined in: [\_spine/core.d.ts:392](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L392)

***

### easeInCubic

> `readonly` **easeInCubic**: [`Fn`](../type-aliases/Fn.md)

Defined in: [\_spine/core.d.ts:384](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L384)

***

### easeInOut

> `readonly` **easeInOut**: [`Fn`](../type-aliases/Fn.md)

Defined in: [\_spine/core.d.ts:394](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L394)

***

### easeInOutCubic

> `readonly` **easeInOutCubic**: [`Fn`](../type-aliases/Fn.md)

Defined in: [\_spine/core.d.ts:386](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L386)

***

### easeOut

> `readonly` **easeOut**: [`Fn`](../type-aliases/Fn.md)

Defined in: [\_spine/core.d.ts:393](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L393)

***

### easeOutBack

> `readonly` **easeOutBack**: [`Fn`](../type-aliases/Fn.md)

Defined in: [\_spine/core.d.ts:388](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L388)

***

### easeOutBounce

> `readonly` **easeOutBounce**: [`Fn`](../type-aliases/Fn.md)

Defined in: [\_spine/core.d.ts:390](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L390)

***

### easeOutCubic

> `readonly` **easeOutCubic**: [`Fn`](../type-aliases/Fn.md)

Defined in: [\_spine/core.d.ts:385](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L385)

***

### easeOutElastic

> `readonly` **easeOutElastic**: [`Fn`](../type-aliases/Fn.md)

Defined in: [\_spine/core.d.ts:389](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L389)

***

### easeOutExpo

> `readonly` **easeOutExpo**: [`Fn`](../type-aliases/Fn.md)

Defined in: [\_spine/core.d.ts:387](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L387)

***

### linear

> `readonly` **linear**: [`Fn`](../type-aliases/Fn.md)

Defined in: [\_spine/core.d.ts:383](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L383)

## Methods

### cubicBezier()

> **cubicBezier**(`x1`, `y1`, `x2`, `y2`): [`Fn`](../type-aliases/Fn.md)

Defined in: [\_spine/core.d.ts:396](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L396)

#### Parameters

##### x1

`number`

##### y1

`number`

##### x2

`number`

##### y2

`number`

#### Returns

[`Fn`](../type-aliases/Fn.md)

***

### easingToLinearCSS()

> **easingToLinearCSS**(`fn`, `sampleCount?`): `string`

Defined in: [\_spine/core.d.ts:397](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L397)

#### Parameters

##### fn

[`Fn`](../type-aliases/Fn.md)

##### sampleCount?

`number`

#### Returns

`string`

***

### spring()

> **spring**(`config`): [`Fn`](../type-aliases/Fn.md)

Defined in: [\_spine/core.d.ts:395](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L395)

#### Parameters

##### config

[`Config`](Config.md)

#### Returns

[`Fn`](../type-aliases/Fn.md)

***

### springNaturalDuration()

> **springNaturalDuration**(`config`, `epsilon?`): `number`

Defined in: [\_spine/core.d.ts:399](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L399)

#### Parameters

##### config

[`Config`](Config.md)

##### epsilon?

`number`

#### Returns

`number`

***

### springToLinearCSS()

> **springToLinearCSS**(`config`, `sampleCount?`): `string`

Defined in: [\_spine/core.d.ts:398](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L398)

#### Parameters

##### config

[`Config`](Config.md)

##### sampleCount?

`number`

#### Returns

`string`
