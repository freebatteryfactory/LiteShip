[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / LiteshipMorphRejectedDetail

# Interface: LiteshipMorphRejectedDetail

Defined in: web/dist/wire/liteship-events.d.ts:22

`liteship:morph-rejected` — preserve constraint violation with optional recovery hint.

## Extends

- [`MorphRejection`](MorphRejection.md)

## Properties

### hint?

> `readonly` `optional` **hint?**: `string`

Defined in: web/dist/types.d.ts:149

Literal next step for the consumer rendering the rejection.

#### Inherited from

[`MorphRejection`](MorphRejection.md).[`hint`](MorphRejection.md#hint)

***

### missingIds?

> `readonly` `optional` **missingIds?**: readonly `string`[]

Defined in: web/dist/types.d.ts:145

#### Inherited from

[`MorphRejection`](MorphRejection.md).[`missingIds`](MorphRejection.md#missingids)

***

### reason

> `readonly` **reason**: `string`

Defined in: web/dist/types.d.ts:147

#### Inherited from

[`MorphRejection`](MorphRejection.md).[`reason`](MorphRejection.md#reason)

***

### recovery?

> `readonly` `optional` **recovery?**: `string`

Defined in: web/dist/wire/liteship-events.d.ts:23

***

### slot?

> `readonly` `optional` **slot?**: [`SlotPath`](../type-aliases/SlotPath.md)

Defined in: web/dist/types.d.ts:146

#### Inherited from

[`MorphRejection`](MorphRejection.md).[`slot`](MorphRejection.md#slot)

***

### type

> `readonly` **type**: `"preserve_violation"`

Defined in: web/dist/types.d.ts:144

Closed union of the rejection kinds the runtime emits.

#### Inherited from

[`MorphRejection`](MorphRejection.md).[`type`](MorphRejection.md#type)
