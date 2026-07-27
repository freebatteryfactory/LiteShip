[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / MorphRejection

# Interface: MorphRejection

Defined in: [\_spine/web.d.ts:113](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L113)

Stable reason and context for a refused DOM morph.

## Properties

### hint?

> `readonly` `optional` **hint?**: `string`

Defined in: [\_spine/web.d.ts:120](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L120)

Literal next step for the consumer rendering the rejection.

***

### missingIds?

> `readonly` `optional` **missingIds?**: readonly `string`[]

Defined in: [\_spine/web.d.ts:116](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L116)

***

### reason

> `readonly` **reason**: `string`

Defined in: [\_spine/web.d.ts:118](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L118)

***

### slot?

> `readonly` `optional` **slot?**: [`SlotPath`](../type-aliases/SlotPath.md)

Defined in: [\_spine/web.d.ts:117](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L117)

***

### type

> `readonly` **type**: `"preserve_violation"`

Defined in: [\_spine/web.d.ts:115](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L115)

Closed union of the rejection kinds the runtime emits.
