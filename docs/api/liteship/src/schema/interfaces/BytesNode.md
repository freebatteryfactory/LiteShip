[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/schema](../README.md) / BytesNode

# Interface: BytesNode

Defined in: core/dist/schema/ast.d.ts:124

A DECLARATION node for an opaque binary carrier — valid iff the value is an
instance of `ctor`. Not structurally derivable; a `withArbitrary` thunk is the
sanctioned way to sample it.

## Extends

- `NodeMeta`

## Properties

### annotations?

> `readonly` `optional` **annotations?**: `Readonly`\<`Record`\<`symbol`, `unknown`\>\>

Defined in: core/dist/schema/ast.d.ts:51

#### Inherited from

`NodeMeta.annotations`

***

### ctor

> `readonly` **ctor**: [`BytesCtor`](../type-aliases/BytesCtor.md)

Defined in: core/dist/schema/ast.d.ts:126

***

### kind

> `readonly` **kind**: `"bytes"`

Defined in: core/dist/schema/ast.d.ts:125

***

### name

> `readonly` **name**: `string`

Defined in: core/dist/schema/ast.d.ts:127
