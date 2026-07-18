[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [stage/src](../README.md) / EncodedVideoExport

# Interface: EncodedVideoExport

Defined in: [stage/src/dual-export.ts:407](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L407)

The result of a REAL byte-encoded video cast: the export node + its bytes.

## Properties

### bytesDigest

> `readonly` **bytesDigest**: `AddressedDigest`

Defined in: [stage/src/dual-export.ts:413](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L413)

Content address of the encoded container bytes (the mp4 byte stream).

***

### encoded

> `readonly` **encoded**: [`EncodedVideo`](EncodedVideo.md)

Defined in: [stage/src/dual-export.ts:411](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L411)

The real encoded video the injected [FrameEncoder](../type-aliases/FrameEncoder.md) produced.

***

### node

> `readonly` **node**: [`ExportNode`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts)

Defined in: [stage/src/dual-export.ts:409](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L409)

The sealed video [ExportNode](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts); its `artifactDigest` pins the byte digest.
