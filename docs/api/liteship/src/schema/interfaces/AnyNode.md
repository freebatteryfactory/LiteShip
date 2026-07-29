[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/schema](../README.md) / AnyNode

# Interface: AnyNode

Defined in: core/dist/schema/ast.d.ts:116

`any` — accepts any value; the runtime twin of [UnknownNode](UnknownNode.md), kept as a
distinct kind so derivers can tell an authored `any` from an `unknown`. Its
inferred TYPE is `unknown`: this repo bans an explicit `any`, and `unknown` is
the sound supertype, so nothing is lost at a decode boundary.

## Extends

- `NodeMeta`

## Properties

### annotations?

> `readonly` `optional` **annotations?**: `Readonly`\<`Record`\<`symbol`, `unknown`\>\>

Defined in: core/dist/schema/ast.d.ts:51

#### Inherited from

`NodeMeta.annotations`

***

### kind

> `readonly` **kind**: `"any"`

Defined in: core/dist/schema/ast.d.ts:117
