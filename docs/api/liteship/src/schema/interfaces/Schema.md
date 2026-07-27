[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/schema](../README.md) / Schema

# Interface: Schema\<A, I\>

Defined in: core/dist/schema/ast.d.ts:160

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

Defined in: core/dist/schema/ast.d.ts:161

***

### Encoded

> `readonly` **Encoded**: `I`

Defined in: core/dist/schema/ast.d.ts:163

***

### Type

> `readonly` **Type**: `A`

Defined in: core/dist/schema/ast.d.ts:162
