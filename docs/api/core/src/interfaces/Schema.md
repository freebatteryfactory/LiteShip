[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Schema

# Interface: Schema\<A, I\>

Defined in: [core/src/schema/ast.ts:207](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/ast.ts#L207)

A kernel schema value over decoded type `A` and encoded type `I`.

`Type`/`Encoded` are PHANTOM: no runtime slot carries them (the wrapper holds
only `ast`). They exist so the value is structurally a
`SchemaPort<A, I> = { readonly Type: A; readonly Encoded: I }` — the same
phantom pair effect Schema carries — letting `Infer` read `A` off any
port-shaped value.

## Type Parameters

### A

`A`

### I

`I` = `A`

## Properties

### ast

> `readonly` **ast**: [`SchemaNode`](../type-aliases/SchemaNode.md)

Defined in: [core/src/schema/ast.ts:208](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/ast.ts#L208)

***

### Encoded

> `readonly` **Encoded**: `I`

Defined in: [core/src/schema/ast.ts:210](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/ast.ts#L210)

***

### Type

> `readonly` **Type**: `A`

Defined in: [core/src/schema/ast.ts:209](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/ast.ts#L209)
