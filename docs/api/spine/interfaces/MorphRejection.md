[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / MorphRejection

# Interface: MorphRejection

Defined in: [\_spine/web.d.ts:119](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L119)

Stable reason and context for a refused DOM morph.

## Properties

### hint?

> `readonly` `optional` **hint?**: `string`

Defined in: [\_spine/web.d.ts:126](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L126)

Literal next step for the consumer rendering the rejection.

***

### missingIds?

> `readonly` `optional` **missingIds?**: readonly `string`[]

Defined in: [\_spine/web.d.ts:122](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L122)

***

### reason

> `readonly` **reason**: `string`

Defined in: [\_spine/web.d.ts:124](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L124)

***

### slot?

> `readonly` `optional` **slot?**: [`SlotPath`](../type-aliases/SlotPath.md)

Defined in: [\_spine/web.d.ts:123](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L123)

***

### type

> `readonly` **type**: `"preserve_violation"`

Defined in: [\_spine/web.d.ts:121](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L121)

Closed union of the rejection kinds the runtime emits.
