[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/schema](../README.md) / TupleNode

# Interface: TupleNode

Defined in: core/dist/schema/ast.d.ts:97

A FIXED-ARITY tuple: a positional list whose length and per-position element
schemas are both pinned. Unlike [ArrayNode](ArrayNode.md) (a homogeneous, variable-length
array), a tuple's arity is part of its type — decode enforces the exact element
count and decodes each position against its own element schema.

## Extends

- `NodeMeta`

## Properties

### annotations?

> `readonly` `optional` **annotations?**: `Readonly`\<`Record`\<`symbol`, `unknown`\>\>

Defined in: core/dist/schema/ast.d.ts:51

#### Inherited from

`NodeMeta.annotations`

***

### elements

> `readonly` **elements**: readonly [`SchemaNode`](../type-aliases/SchemaNode.md)[]

Defined in: core/dist/schema/ast.d.ts:99

***

### kind

> `readonly` **kind**: `"tuple"`

Defined in: core/dist/schema/ast.d.ts:98
