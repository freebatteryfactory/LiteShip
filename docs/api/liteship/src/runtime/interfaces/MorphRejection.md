[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / MorphRejection

# Interface: MorphRejection

Defined in: web/dist/types.d.ts:134

Morph rejection when preserve constraints are violated.

## Properties

### hint?

> `readonly` `optional` **hint?**: `string`

Defined in: web/dist/types.d.ts:141

Literal next step for the consumer rendering the rejection.

***

### missingIds?

> `readonly` `optional` **missingIds?**: readonly `string`[]

Defined in: web/dist/types.d.ts:137

***

### reason

> `readonly` **reason**: `string`

Defined in: web/dist/types.d.ts:139

***

### slot?

> `readonly` `optional` **slot?**: [`SlotPath`](../type-aliases/SlotPath.md)

Defined in: web/dist/types.d.ts:138

***

### type

> `readonly` **type**: `"preserve_violation"`

Defined in: web/dist/types.d.ts:136

Closed union of the rejection kinds the runtime emits.
