[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [stage/src](../README.md) / EncodedVideo

# Interface: EncodedVideo

Defined in: [stage/src/dual-export.ts:78](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L78)

The real encoded video bytes a [FrameEncoder](../type-aliases/FrameEncoder.md) produces.

## Properties

### bytes

> `readonly` **bytes**: `Uint8Array`

Defined in: [stage/src/dual-export.ts:80](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L80)

The encoded container bytes (e.g. a real ISO-BMFF/MP4 byte stream).

***

### codec

> `readonly` **codec**: `string`

Defined in: [stage/src/dual-export.ts:82](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L82)

Codec id of the encode (e.g. `'h264'`, `'avc1.42001E'`).

***

### container

> `readonly` **container**: `string`

Defined in: [stage/src/dual-export.ts:84](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L84)

Container/MIME of the bytes (e.g. `'video/mp4'`).
