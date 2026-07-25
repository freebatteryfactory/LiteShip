[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [stage/src](../README.md) / DualExportNodeResult

# Interface: DualExportNodeResult

Defined in: [stage/src/dual-export.ts:638](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L638)

The result of a HEADLESS dual export: the full [DualExportResult](DualExportResult.md) proof
PLUS the real encoded video the injected [FrameEncoder](../type-aliases/FrameEncoder.md) produced.

## Extends

- [`DualExportResult`](DualExportResult.md)

## Properties

### astro

> `readonly` **astro**: [`ExportNode`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts)

Defined in: [stage/src/dual-export.ts:538](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L538)

The static-page carrier (`carrier: 'astro-page'`).

#### Inherited from

[`DualExportResult`](DualExportResult.md).[`astro`](DualExportResult.md#astro)

***

### astroReceipt

> `readonly` **astroReceipt**: `ReceiptEnvelope`

Defined in: [stage/src/dual-export.ts:542](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L542)

Per-cast child receipts (genesis envelopes), kept for replay/audit.

#### Inherited from

[`DualExportResult`](DualExportResult.md).[`astroReceipt`](DualExportResult.md#astroreceipt)

***

### bytesDigest

> `readonly` **bytesDigest**: `AddressedDigest`

Defined in: [stage/src/dual-export.ts:647](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L647)

Content address of the encoded container bytes (the mp4 byte stream).

***

### encoded

> `readonly` **encoded**: [`EncodedVideo`](EncodedVideo.md)

Defined in: [stage/src/dual-export.ts:645](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L645)

The real encoded video (a validatable MP4 when the ffmpeg adapter is used).
This rides ALONGSIDE the proof — the proof's `video` carrier remains a
content address of the produced FRAMES, never the encoded bytes, so the
page-digest == video-source-digest invariant is identical to [dualExport](../functions/dualExport.md).

***

### encodedReceipt

> `readonly` **encodedReceipt**: `ReceiptEnvelope`

Defined in: [stage/src/dual-export.ts:649](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L649)

Receipt for the real encoded-byte artifact (separate from the frame proof).

***

### receipt

> `readonly` **receipt**: `ReceiptEnvelope`

Defined in: [stage/src/dual-export.ts:549](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L549)

The single assertable head: a parent MERGE envelope whose
`previous = [astroReceipt.hash, videoReceipt.hash]` and whose payload pins
`sharedSourceDigest`. Both child casts resolve to the same `graph.id`.

#### Inherited from

[`DualExportResult`](DualExportResult.md).[`receipt`](DualExportResult.md#receipt)

***

### sharedSourceDigest

> `readonly` **sharedSourceDigest**: `AddressedDigest`

Defined in: [stage/src/dual-export.ts:536](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L536)

The ONE source digest both casts derive from — `=== graph.digest`.

#### Inherited from

[`DualExportResult`](DualExportResult.md).[`sharedSourceDigest`](DualExportResult.md#sharedsourcedigest)

***

### video

> `readonly` **video**: [`ExportNode`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts)

Defined in: [stage/src/dual-export.ts:540](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L540)

The video carrier (`carrier: 'video'`).

#### Inherited from

[`DualExportResult`](DualExportResult.md).[`video`](DualExportResult.md#video)

***

### videoReceipt

> `readonly` **videoReceipt**: `ReceiptEnvelope`

Defined in: [stage/src/dual-export.ts:543](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L543)

#### Inherited from

[`DualExportResult`](DualExportResult.md).[`videoReceipt`](DualExportResult.md#videoreceipt)
