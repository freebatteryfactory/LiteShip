[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / glslIdent

# Function: glslIdent()

> **glslIdent**(`name`): `string`

Defined in: [core/src/projection.ts:56](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/projection.ts#L56)

Canonical GLSL uniform identifier for a name: prefix `u_`, kebab/camelCase
folded to snake_case, lowercased. This is the exact identifier the GLSL
compiler declares, so runtime values key onto the right uniform. Shared by
`@czap/compiler`'s GLSL arm (`toUniformName`) and the runtime so the build
and runtime cannot disagree.

## Parameters

### name

`string`

## Returns

`string`
