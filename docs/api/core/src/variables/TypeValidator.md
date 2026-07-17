[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / TypeValidator

# Variable: TypeValidator

> `const` **TypeValidator**: `object`

Defined in: [core/src/capsule.ts:266](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/capsule.ts#L266)

Runtime validator that verifies values against kernel schemas.

[TypeValidator.validate](#validate) is a SYNC strict kernel decode: it returns a
value-or-tagged-error [Result](../namespaces/TypeValidator/type-aliases/Result.md) — an `ok` carrying the decoded `T`, or an
`err` carrying a tagged [ParseError](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts) folded from the strict decoder's
path-tagged issue list. It never throws on bad input and never returns an
Effect. Used by capsule dispatchers to check inputs before invoking handlers.

## Type Declaration

### validate()

> `readonly` **validate**\<`T`\>(`schema`, `value`): `Result`\<`T`, [`ParseError`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts)\>

#### Type Parameters

##### T

`T`

#### Parameters

##### schema

[`Schema`](../interfaces/Schema.md)\<`T`\>

##### value

`unknown`

#### Returns

`Result`\<`T`, [`ParseError`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts)\>
