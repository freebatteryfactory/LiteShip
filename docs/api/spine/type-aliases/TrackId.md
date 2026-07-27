[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / TrackId

# Type Alias: TrackId\<K\>

> **TrackId**\<`K`\> = `string` & `object`

Defined in: [\_spine/scene.d.ts:30](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/scene.d.ts#L30)

Branded track identifier, keyed by track kind.

The phantom parameter `K` is encoded in the brand symbol's value so
`TrackId<'video'>` and `TrackId<'audio'>` are distinct nominal types.
Cross-kind assignment fails at compile time.

## Type Declaration

### \[TrackIdBrand\]

> `readonly` **\[TrackIdBrand\]**: `K`

## Type Parameters

### K

`K` *extends* [`TrackKind`](TrackKind.md)
