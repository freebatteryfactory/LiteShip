[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / MorphRejection

# Interface: MorphRejection

Defined in: [web/src/types.ts:160](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L160)

Morph rejection when preserve constraints are violated.

## Properties

### hint?

> `readonly` `optional` **hint?**: `string`

Defined in: [web/src/types.ts:167](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L167)

Literal next step for the consumer rendering the rejection.

***

### missingIds?

> `readonly` `optional` **missingIds?**: readonly `string`[]

Defined in: [web/src/types.ts:163](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L163)

***

### reason

> `readonly` **reason**: `string`

Defined in: [web/src/types.ts:165](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L165)

***

### slot?

> `readonly` `optional` **slot?**: [`SlotPath`](../type-aliases/SlotPath.md)

Defined in: [web/src/types.ts:164](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L164)

***

### type

> `readonly` **type**: `"preserve_violation"`

Defined in: [web/src/types.ts:162](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L162)

Closed union of the rejection kinds the runtime emits.
