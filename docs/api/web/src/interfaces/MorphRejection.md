[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [web/src](../README.md) / MorphRejection

# Interface: MorphRejection

Defined in: [web/src/types.ts:157](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L157)

Morph rejection when preserve constraints are violated.

## Properties

### hint?

> `readonly` `optional` **hint?**: `string`

Defined in: [web/src/types.ts:164](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L164)

Literal next step for the consumer rendering the rejection.

***

### missingIds?

> `readonly` `optional` **missingIds?**: readonly `string`[]

Defined in: [web/src/types.ts:160](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L160)

***

### reason

> `readonly` **reason**: `string`

Defined in: [web/src/types.ts:162](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L162)

***

### slot?

> `readonly` `optional` **slot?**: [`SlotPath`](../type-aliases/SlotPath.md)

Defined in: [web/src/types.ts:161](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L161)

***

### type

> `readonly` **type**: `"preserve_violation"`

Defined in: [web/src/types.ts:159](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L159)

Closed union of the rejection kinds the runtime emits.
