[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / LiteshipMorphRejectedDetail

# Interface: LiteshipMorphRejectedDetail

Defined in: [web/src/wire/liteship-events.ts:25](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L25)

`liteship:morph-rejected` — preserve constraint violation with optional recovery hint.

## Extends

- [`MorphRejection`](MorphRejection.md)

## Properties

### hint?

> `readonly` `optional` **hint?**: `string`

Defined in: [web/src/types.ts:171](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L171)

Literal next step for the consumer rendering the rejection.

#### Inherited from

[`MorphRejection`](MorphRejection.md).[`hint`](MorphRejection.md#hint)

***

### missingIds?

> `readonly` `optional` **missingIds?**: readonly `string`[]

Defined in: [web/src/types.ts:167](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L167)

#### Inherited from

[`MorphRejection`](MorphRejection.md).[`missingIds`](MorphRejection.md#missingids)

***

### reason

> `readonly` **reason**: `string`

Defined in: [web/src/types.ts:169](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L169)

#### Inherited from

[`MorphRejection`](MorphRejection.md).[`reason`](MorphRejection.md#reason)

***

### recovery?

> `readonly` `optional` **recovery?**: `string`

Defined in: [web/src/wire/liteship-events.ts:26](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/wire/liteship-events.ts#L26)

***

### slot?

> `readonly` `optional` **slot?**: [`SlotPath`](../type-aliases/SlotPath.md)

Defined in: [web/src/types.ts:168](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L168)

#### Inherited from

[`MorphRejection`](MorphRejection.md).[`slot`](MorphRejection.md#slot)

***

### type

> `readonly` **type**: `"preserve_violation"`

Defined in: [web/src/types.ts:166](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L166)

Closed union of the rejection kinds the runtime emits.

#### Inherited from

[`MorphRejection`](MorphRejection.md).[`type`](MorphRejection.md#type)
