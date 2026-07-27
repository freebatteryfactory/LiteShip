[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [stage/src](../README.md) / DualExportNodeResult

# Interface: DualExportNodeResult

Defined in: [stage/src/dual-export.ts:630](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L630)

The result of a HEADLESS dual export: the full [DualExportResult](DualExportResult.md) proof
PLUS the real encoded video the injected [FrameEncoder](../type-aliases/FrameEncoder.md) produced.

## Extends

- [`DualExportResult`](DualExportResult.md)

## Properties

### astro

> `readonly` **astro**: [`ExportNode`](../../../liteship/src/graph/interfaces/ExportNode.md)

Defined in: [stage/src/dual-export.ts:530](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L530)

The static-page carrier (`carrier: 'astro-page'`).

#### Inherited from

[`DualExportResult`](DualExportResult.md).[`astro`](DualExportResult.md#astro)

***

### astroReceipt

> `readonly` **astroReceipt**: [`ReceiptEnvelope`](../../../liteship/src/evidence/interfaces/ReceiptEnvelope.md)

Defined in: [stage/src/dual-export.ts:534](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L534)

Per-cast child receipts (genesis envelopes), kept for replay/audit.

#### Inherited from

[`DualExportResult`](DualExportResult.md).[`astroReceipt`](DualExportResult.md#astroreceipt)

***

### bytesDigest

> `readonly` **bytesDigest**: [`AddressedDigest`](../../../spine/interfaces/AddressedDigest.md)

Defined in: [stage/src/dual-export.ts:639](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L639)

Content address of the encoded container bytes (the mp4 byte stream).

***

### encoded

> `readonly` **encoded**: [`EncodedVideo`](EncodedVideo.md)

Defined in: [stage/src/dual-export.ts:637](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L637)

The real encoded video (a validatable MP4 when the ffmpeg adapter is used).
This rides ALONGSIDE the proof — the proof's `video` carrier remains a
content address of the produced FRAMES, never the encoded bytes, so the
page-digest == video-source-digest invariant is identical to [dualExport](../functions/dualExport.md).

***

### encodedReceipt

> `readonly` **encodedReceipt**: [`ReceiptEnvelope`](../../../liteship/src/evidence/interfaces/ReceiptEnvelope.md)

Defined in: [stage/src/dual-export.ts:641](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L641)

Receipt for the real encoded-byte artifact (separate from the frame proof).

***

### receipt

> `readonly` **receipt**: [`ReceiptEnvelope`](../../../liteship/src/evidence/interfaces/ReceiptEnvelope.md)

Defined in: [stage/src/dual-export.ts:541](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L541)

The single assertable head: a parent MERGE envelope whose
`previous = [astroReceipt.hash, videoReceipt.hash]` and whose payload pins
`sharedSourceDigest`. Both child casts resolve to the same `graph.id`.

#### Inherited from

[`DualExportResult`](DualExportResult.md).[`receipt`](DualExportResult.md#receipt)

***

### sharedSourceDigest

> `readonly` **sharedSourceDigest**: [`AddressedDigest`](../../../spine/interfaces/AddressedDigest.md)

Defined in: [stage/src/dual-export.ts:528](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L528)

The ONE source digest both casts derive from — `=== graph.digest`.

#### Inherited from

[`DualExportResult`](DualExportResult.md).[`sharedSourceDigest`](DualExportResult.md#sharedsourcedigest)

***

### video

> `readonly` **video**: [`ExportNode`](../../../liteship/src/graph/interfaces/ExportNode.md)

Defined in: [stage/src/dual-export.ts:532](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L532)

The video carrier (`carrier: 'video'`).

#### Inherited from

[`DualExportResult`](DualExportResult.md).[`video`](DualExportResult.md#video)

***

### videoReceipt

> `readonly` **videoReceipt**: [`ReceiptEnvelope`](../../../liteship/src/evidence/interfaces/ReceiptEnvelope.md)

Defined in: [stage/src/dual-export.ts:535](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L535)

#### Inherited from

[`DualExportResult`](DualExportResult.md).[`videoReceipt`](DualExportResult.md#videoreceipt)
