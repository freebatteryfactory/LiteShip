[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [stage/src](../README.md) / EncodedVideo

# Interface: EncodedVideo

Defined in: [stage/src/dual-export.ts:71](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L71)

The real encoded video bytes a [FrameEncoder](../type-aliases/FrameEncoder.md) produces.

## Properties

### bytes

> `readonly` **bytes**: `Uint8Array`

Defined in: [stage/src/dual-export.ts:73](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L73)

The encoded container bytes (e.g. a real ISO-BMFF/MP4 byte stream).

***

### codec

> `readonly` **codec**: `string`

Defined in: [stage/src/dual-export.ts:75](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L75)

Codec id of the encode (e.g. `'h264'`, `'avc1.42001E'`).

***

### container

> `readonly` **container**: `string`

Defined in: [stage/src/dual-export.ts:77](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L77)

Container/MIME of the bytes (e.g. `'video/mp4'`).
