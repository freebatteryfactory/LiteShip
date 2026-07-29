[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / VitePrimitive

# Type Alias: VitePrimitive\<K\>

> **VitePrimitive**\<`K`\> = `K` *extends* `"boundary"` ? [`Boundary`](../interfaces/Boundary.md) : `K` *extends* `"token"` ? [`Token`](../interfaces/Token.md) : `K` *extends* `"theme"` ? [`Theme`](../interfaces/Theme.md) : [`Style`](../interfaces/Style.md)

Defined in: [\_spine/vite.d.ts:17](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/vite.d.ts#L17)

Definition type selected by a Vite primitive kind.

## Type Parameters

### K

`K` *extends* [`PrimitiveKind`](PrimitiveKind.md)
