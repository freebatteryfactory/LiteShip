[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / TypeValidator

# Variable: TypeValidator

> `const` **TypeValidator**: `object`

Defined in: [core/src/capsule.ts:257](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/capsule.ts#L257)

Runtime validator that verifies values against _spine-derived schemas.
Used by capsule dispatchers to check inputs before invoking handlers.

## Type Declaration

### validate()

> `readonly` **validate**\<`T`\>(`schema`, `value`): `Effect`\<`T`, `SchemaError`\>

#### Type Parameters

##### T

`T`

#### Parameters

##### schema

`Codec`\<`T`, `T`, `never`\>

##### value

`unknown`

#### Returns

`Effect`\<`T`, `SchemaError`\>
