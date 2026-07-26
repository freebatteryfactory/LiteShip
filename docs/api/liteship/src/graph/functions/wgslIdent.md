[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/graph](../README.md) / wgslIdent

# Function: wgslIdent()

> **wgslIdent**(`name`): `string`

Defined in: core/dist/graph/projection.d.ts:49

Canonical WGSL struct-field identifier for a name: kebab/camelCase folded to
snake_case, lowercased, with NO prefix. This is the exact field name the WGSL
compiler declares (`toFieldName` in `@liteship/compiler`'s WGSL arm), so the
compositor's `wgsl` output keys onto the right `@group/@binding` uniform
struct member. WGSL bindings are bare field names (unlike GLSL's `u_` prefix).

## Parameters

### name

`string`

## Returns

`string`
