[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [stage/src](../README.md) / EncodedVideoExport

# Interface: EncodedVideoExport

Defined in: [stage/src/dual-export.ts:438](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L438)

The result of a REAL byte-encoded video cast: the export node + its bytes.

## Properties

### bytesDigest

> `readonly` **bytesDigest**: `AddressedDigest`

Defined in: [stage/src/dual-export.ts:444](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L444)

Content address of the encoded container bytes (the mp4 byte stream).

***

### encoded

> `readonly` **encoded**: [`EncodedVideo`](EncodedVideo.md)

Defined in: [stage/src/dual-export.ts:442](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L442)

The real encoded video the injected [FrameEncoder](../type-aliases/FrameEncoder.md) produced.

***

### node

> `readonly` **node**: [`ExportNode`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts)

Defined in: [stage/src/dual-export.ts:440](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L440)

The sealed video [ExportNode](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts); its `artifactDigest` pins the byte digest.

***

### receipt

> `readonly` **receipt**: `ReceiptEnvelope`

Defined in: [stage/src/dual-export.ts:446](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L446)

Genesis receipt binding the source graph, rendered frames, and encoded bytes.
