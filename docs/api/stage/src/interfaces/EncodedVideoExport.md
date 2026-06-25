[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [stage/src](../README.md) / EncodedVideoExport

# Interface: EncodedVideoExport

Defined in: [stage/src/dual-export.ts:383](https://github.com/heyoub/LiteShip/blob/main/packages/stage/src/dual-export.ts#L383)

The result of a REAL byte-encoded video cast: the export node + its bytes.

## Properties

### bytesDigest

> `readonly` **bytesDigest**: `AddressedDigest`

Defined in: [stage/src/dual-export.ts:389](https://github.com/heyoub/LiteShip/blob/main/packages/stage/src/dual-export.ts#L389)

Content address of the encoded container bytes (the mp4 byte stream).

***

### encoded

> `readonly` **encoded**: [`EncodedVideo`](EncodedVideo.md)

Defined in: [stage/src/dual-export.ts:387](https://github.com/heyoub/LiteShip/blob/main/packages/stage/src/dual-export.ts#L387)

The real encoded video the injected [FrameEncoder](../type-aliases/FrameEncoder.md) produced.

***

### node

> `readonly` **node**: `ExportNode`

Defined in: [stage/src/dual-export.ts:385](https://github.com/heyoub/LiteShip/blob/main/packages/stage/src/dual-export.ts#L385)

The sealed video ExportNode; its `artifactDigest` pins the byte digest.
