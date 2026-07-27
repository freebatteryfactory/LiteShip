[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/schema](../README.md) / BrandNode

# Interface: BrandNode

Defined in: core/dist/schema/ast.d.ts:134

A nominal refinement: decode the `base`, then run `refine` (a parse-don't-
validate smart constructor). A thrown `ValidationError` folds into a
`schema/brand` decode issue; a returned value is the branded output.

## Extends

- `NodeMeta`

## Properties

### annotations?

> `readonly` `optional` **annotations?**: `Readonly`\<`Record`\<`symbol`, `unknown`\>\>

Defined in: core/dist/schema/ast.d.ts:51

#### Inherited from

`NodeMeta.annotations`

***

### base

> `readonly` **base**: [`SchemaNode`](../type-aliases/SchemaNode.md)

Defined in: core/dist/schema/ast.d.ts:136

***

### kind

> `readonly` **kind**: `"brand"`

Defined in: core/dist/schema/ast.d.ts:135

***

### name

> `readonly` **name**: `string`

Defined in: core/dist/schema/ast.d.ts:137

***

### refine

> `readonly` **refine**: (`value`) => `unknown`

Defined in: core/dist/schema/ast.d.ts:138

#### Parameters

##### value

`unknown`

#### Returns

`unknown`
