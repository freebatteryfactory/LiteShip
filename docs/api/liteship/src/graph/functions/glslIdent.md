[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/graph](../README.md) / glslIdent

# Function: glslIdent()

> **glslIdent**(`name`): `string`

Defined in: core/dist/graph/projection.d.ts:41

Canonical GLSL uniform identifier for a name: prefix `u_`, kebab/camelCase
folded to snake_case, lowercased. This is the exact identifier the GLSL
compiler declares, so runtime values key onto the right uniform. Shared by
`@liteship/compiler`'s GLSL arm (`toUniformName`) and the runtime so the build
and runtime cannot disagree.

## Parameters

### name

`string`

## Returns

`string`
