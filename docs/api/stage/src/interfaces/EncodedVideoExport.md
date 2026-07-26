[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [stage/src](../README.md) / EncodedVideoExport

# Interface: EncodedVideoExport

Defined in: [stage/src/dual-export.ts:418](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L418)

The result of a REAL byte-encoded video cast: the export node + its bytes.

## Properties

### bytesDigest

> `readonly` **bytesDigest**: `AddressedDigest`

Defined in: [stage/src/dual-export.ts:424](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L424)

Content address of the encoded container bytes (the mp4 byte stream).

***

### encoded

> `readonly` **encoded**: [`EncodedVideo`](EncodedVideo.md)

Defined in: [stage/src/dual-export.ts:422](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L422)

The real encoded video the injected [FrameEncoder](../type-aliases/FrameEncoder.md) produced.

***

### node

> `readonly` **node**: [`ExportNode`](../../../liteship/src/graph/interfaces/ExportNode.md)

Defined in: [stage/src/dual-export.ts:420](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L420)

The sealed video [ExportNode](../../../liteship/src/graph/interfaces/ExportNode.md); its `artifactDigest` pins the byte digest.

***

### receipt

> `readonly` **receipt**: [`ReceiptEnvelope`](../../../liteship/src/evidence/interfaces/ReceiptEnvelope.md)

Defined in: [stage/src/dual-export.ts:426](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L426)

Genesis receipt binding the source graph, rendered frames, and encoded bytes.
