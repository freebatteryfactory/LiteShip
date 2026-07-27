[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / Quantizer

# Interface: Quantizer\<B\>

Defined in: [\_spine/core.d.ts:976](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L976)

Immutable output mapping for every state of a boundary.

## Extended by

- [`ReactiveQuantizer`](ReactiveQuantizer.md)

## Type Parameters

### B

`B` *extends* [`Boundary`](Boundary.md) = [`Boundary`](Boundary.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"Quantizer"`

Defined in: [\_spine/core.d.ts:977](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L977)

***

### boundary

> `readonly` **boundary**: `B`

Defined in: [\_spine/core.d.ts:978](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L978)

***

### stateSync?

> `readonly` `optional` **stateSync?**: () => [`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

Defined in: [\_spine/core.d.ts:980](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L980)

Synchronous state accessor for hot paths (avoids reactive read overhead).

#### Returns

[`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

## Methods

### evaluate()

> **evaluate**(`value`): [`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

Defined in: [\_spine/core.d.ts:981](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L981)

#### Parameters

##### value

`number`

#### Returns

[`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>
