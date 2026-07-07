[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / MorphRejection

# Interface: MorphRejection

Defined in: [web/src/types.ts:164](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L164)

Morph rejection when preserve constraints are violated.

## Extended by

- [`CzapMorphRejectedDetail`](CzapMorphRejectedDetail.md)

## Properties

### hint?

> `readonly` `optional` **hint?**: `string`

Defined in: [web/src/types.ts:171](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L171)

Literal next step for the consumer rendering the rejection.

***

### missingIds?

> `readonly` `optional` **missingIds?**: readonly `string`[]

Defined in: [web/src/types.ts:167](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L167)

***

### reason

> `readonly` **reason**: `string`

Defined in: [web/src/types.ts:169](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L169)

***

### slot?

> `readonly` `optional` **slot?**: [`SlotPath`](../type-aliases/SlotPath.md)

Defined in: [web/src/types.ts:168](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L168)

***

### type

> `readonly` **type**: `"preserve_violation"`

Defined in: [web/src/types.ts:166](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L166)

Closed union of the rejection kinds the runtime emits.
