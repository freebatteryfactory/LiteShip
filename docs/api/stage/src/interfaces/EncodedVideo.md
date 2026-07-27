[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [stage/src](../README.md) / EncodedVideo

# Interface: EncodedVideo

Defined in: [stage/src/dual-export.ts:70](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L70)

The real encoded video bytes a [FrameEncoder](../type-aliases/FrameEncoder.md) produces.

## Properties

### bytes

> `readonly` **bytes**: `Uint8Array`

Defined in: [stage/src/dual-export.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L72)

The encoded container bytes (e.g. a real ISO-BMFF/MP4 byte stream).

***

### codec

> `readonly` **codec**: `string`

Defined in: [stage/src/dual-export.ts:74](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L74)

Codec id of the encode (e.g. `'h264'`, `'avc1.42001E'`).

***

### container

> `readonly` **container**: `string`

Defined in: [stage/src/dual-export.ts:76](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L76)

Container/MIME of the bytes (e.g. `'video/mp4'`).
