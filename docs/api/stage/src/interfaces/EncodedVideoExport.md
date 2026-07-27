[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [stage/src](../README.md) / EncodedVideoExport

# Interface: EncodedVideoExport

Defined in: [stage/src/dual-export.ts:425](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L425)

The result of a REAL byte-encoded video cast: the export node + its bytes.

## Properties

### bytesDigest

> `readonly` **bytesDigest**: [`AddressedDigest`](../../../spine/interfaces/AddressedDigest.md)

Defined in: [stage/src/dual-export.ts:431](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L431)

Content address of the encoded container bytes (the mp4 byte stream).

***

### encoded

> `readonly` **encoded**: [`EncodedVideo`](EncodedVideo.md)

Defined in: [stage/src/dual-export.ts:429](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L429)

The real encoded video the injected [FrameEncoder](../type-aliases/FrameEncoder.md) produced.

***

### node

> `readonly` **node**: [`ExportNode`](../../../liteship/src/graph/interfaces/ExportNode.md)

Defined in: [stage/src/dual-export.ts:427](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L427)

The sealed video [ExportNode](../../../liteship/src/graph/interfaces/ExportNode.md); its `artifactDigest` pins the byte digest.

***

### receipt

> `readonly` **receipt**: [`ReceiptEnvelope`](../../../liteship/src/evidence/interfaces/ReceiptEnvelope.md)

Defined in: [stage/src/dual-export.ts:433](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L433)

Genesis receipt binding the source graph, rendered frames, and encoded bytes.
