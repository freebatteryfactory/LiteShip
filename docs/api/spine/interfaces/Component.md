[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / Component

# Interface: Component\<B, SlotNames\>

Defined in: [\_spine/design.d.ts:175](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/design.d.ts#L175)

Reusable styled component definition with named content slots.

## Type Parameters

### B

`B` *extends* [`Boundary`](Boundary.md) = [`Boundary`](Boundary.md)

### SlotNames

`SlotNames` *extends* readonly `string`[] = readonly `string`[]

## Properties

### \_tag

> `readonly` **\_tag**: `"ComponentDef"`

Defined in: [\_spine/design.d.ts:176](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/design.d.ts#L176)

***

### \_version

> `readonly` **\_version**: `1`

Defined in: [\_spine/design.d.ts:177](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/design.d.ts#L177)

***

### boundary?

> `readonly` `optional` **boundary?**: `B`

Defined in: [\_spine/design.d.ts:180](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/design.d.ts#L180)

***

### defaultSlot?

> `readonly` `optional` **defaultSlot?**: `SlotNames`\[`number`\]

Defined in: [\_spine/design.d.ts:183](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/design.d.ts#L183)

***

### id

> `readonly` **id**: [`ContentAddress`](../type-aliases/ContentAddress.md)

Defined in: [\_spine/design.d.ts:178](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/design.d.ts#L178)

***

### name

> `readonly` **name**: `string`

Defined in: [\_spine/design.d.ts:179](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/design.d.ts#L179)

***

### slots

> `readonly` **slots**: `{ readonly [K in string]: SlotConfig }`

Defined in: [\_spine/design.d.ts:182](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/design.d.ts#L182)

***

### styles

> `readonly` **styles**: [`Style`](Style.md)\<`B`\>

Defined in: [\_spine/design.d.ts:181](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/design.d.ts#L181)
