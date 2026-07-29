[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / MorphRejection

# Interface: MorphRejection

Defined in: web/dist/types.d.ts:142

Morph rejection when preserve constraints are violated.

## Properties

### hint?

> `readonly` `optional` **hint?**: `string`

Defined in: web/dist/types.d.ts:149

Literal next step for the consumer rendering the rejection.

***

### missingIds?

> `readonly` `optional` **missingIds?**: readonly `string`[]

Defined in: web/dist/types.d.ts:145

***

### reason

> `readonly` **reason**: `string`

Defined in: web/dist/types.d.ts:147

***

### slot?

> `readonly` `optional` **slot?**: [`SlotPath`](../type-aliases/SlotPath.md)

Defined in: web/dist/types.d.ts:146

***

### type

> `readonly` **type**: `"preserve_violation"`

Defined in: web/dist/types.d.ts:144

Closed union of the rejection kinds the runtime emits.
