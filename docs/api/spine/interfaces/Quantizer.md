[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / Quantizer

# Interface: Quantizer\<B\>

Defined in: [\_spine/core.d.ts:761](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L761)

Immutable output mapping for every state of a boundary.

## Extended by

- [`ReactiveQuantizer`](ReactiveQuantizer.md)

## Type Parameters

### B

`B` *extends* [`Boundary`](Boundary.md) = [`Boundary`](Boundary.md)

## Properties

### \_tag

> `readonly` **\_tag**: `"Quantizer"`

Defined in: [\_spine/core.d.ts:762](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L762)

***

### boundary

> `readonly` **boundary**: `B`

Defined in: [\_spine/core.d.ts:763](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L763)

***

### stateSync?

> `readonly` `optional` **stateSync?**: () => [`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

Defined in: [\_spine/core.d.ts:765](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L765)

Synchronous state accessor for hot paths (avoids reactive read overhead).

#### Returns

[`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

## Methods

### evaluate()

> **evaluate**(`value`): [`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>

Defined in: [\_spine/core.d.ts:766](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L766)

#### Parameters

##### value

`number`

#### Returns

[`StateUnion`](../type-aliases/StateUnion.md)\<`B`\>
