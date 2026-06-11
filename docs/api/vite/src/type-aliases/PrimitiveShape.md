[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / PrimitiveShape

# Type Alias: PrimitiveShape\<K\>

> **PrimitiveShape**\<`K`\> = `K` *extends* `"boundary"` ? [`Boundary.Shape`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/namespaces/Boundary/type-aliases/Shape.md) : `K` *extends* `"token"` ? [`Token.Shape`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/namespaces/Token/type-aliases/Shape.md) : `K` *extends* `"theme"` ? [`Theme.Shape`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/namespaces/Theme/type-aliases/Shape.md) : [`Style.Shape`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/namespaces/Style/type-aliases/Shape.md)

Defined in: [vite/src/primitive-resolve.ts:31](https://github.com/heyoub/LiteShip/blob/main/packages/vite/src/primitive-resolve.ts#L31)

Map a [PrimitiveKind](PrimitiveKind.md) to the structural type of the primitive
it resolves (`Boundary.Shape`, `Token.Shape`, ...).

## Type Parameters

### K

`K` *extends* [`PrimitiveKind`](PrimitiveKind.md)
