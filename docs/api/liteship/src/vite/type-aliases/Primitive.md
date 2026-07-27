[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/vite](../README.md) / Primitive

# Type Alias: Primitive\<K\>

> **Primitive**\<`K`\> = `K` *extends* `"boundary"` ? [`Boundary`](../../type-aliases/Boundary.md) : `K` *extends* `"token"` ? [`Token`](../../type-aliases/Token.md) : `K` *extends* `"theme"` ? [`Theme`](../../type-aliases/Theme.md) : [`Style`](../../type-aliases/Style.md)

Defined in: vite/dist/primitive-resolve.d.ts:25

Map a [PrimitiveKind](../../../../vite/src/type-aliases/PrimitiveKind.md) to the structural type of the primitive
it resolves (`Boundary`, `Token`, ...).

## Type Parameters

### K

`K` *extends* [`PrimitiveKind`](../../../../vite/src/type-aliases/PrimitiveKind.md)
