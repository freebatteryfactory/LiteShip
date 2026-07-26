[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / PrimitiveShape

# Type Alias: PrimitiveShape\<K\>

> **PrimitiveShape**\<`K`\> = `K` *extends* `"boundary"` ? [`Boundary`](../../../liteship/src/type-aliases/Boundary.md) : `K` *extends* `"token"` ? [`Token`](../../../liteship/src/type-aliases/Token.md) : `K` *extends* `"theme"` ? [`Theme`](../../../liteship/src/type-aliases/Theme.md) : [`Style`](../../../liteship/src/type-aliases/Style.md)

Defined in: [vite/src/primitive-resolve.ts:31](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/primitive-resolve.ts#L31)

Map a [PrimitiveKind](PrimitiveKind.md) to the structural type of the primitive
it resolves (`Boundary`, `Token`, ...).

## Type Parameters

### K

`K` *extends* [`PrimitiveKind`](PrimitiveKind.md)
