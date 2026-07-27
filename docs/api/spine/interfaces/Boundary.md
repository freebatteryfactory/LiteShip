[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / Boundary

# Interface: Boundary\<I, S\>

Defined in: [\_spine/core.d.ts:249](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L249)

Immutable threshold partition that maps one numeric input to named states.

## Type Parameters

### I

`I` *extends* `string` = `string`

### S

`S` *extends* readonly \[`string`, `...string[]`\] = readonly \[`string`, `...string[]`\]

## Properties

### \_tag

> `readonly` **\_tag**: `"BoundaryDef"`

Defined in: [\_spine/core.d.ts:253](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L253)

***

### \_version

> `readonly` **\_version**: `1`

Defined in: [\_spine/core.d.ts:254](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L254)

***

### hysteresis?

> `readonly` `optional` **hysteresis?**: `number`

Defined in: [\_spine/core.d.ts:259](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L259)

***

### id

> `readonly` **id**: [`ContentAddress`](../type-aliases/ContentAddress.md)

Defined in: [\_spine/core.d.ts:255](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L255)

***

### input

> `readonly` **input**: [`SignalInput`](../type-aliases/SignalInput.md)\<`I`\>

Defined in: [\_spine/core.d.ts:256](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L256)

***

### spec?

> `readonly` `optional` **spec?**: [`BoundarySpec`](BoundarySpec.md)

Defined in: [\_spine/core.d.ts:260](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L260)

***

### states

> `readonly` **states**: `S`

Defined in: [\_spine/core.d.ts:258](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L258)

***

### thresholds

> `readonly` **thresholds**: readonly [`ThresholdValue`](../type-aliases/ThresholdValue.md)[]

Defined in: [\_spine/core.d.ts:257](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L257)
