[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [stage/src](../README.md) / DualExportNodeResult

# Interface: DualExportNodeResult

Defined in: [stage/src/dual-export.ts:544](https://github.com/heyoub/LiteShip/blob/main/packages/stage/src/dual-export.ts#L544)

The result of a HEADLESS dual export: the full [DualExportResult](DualExportResult.md) proof
PLUS the real encoded video the injected [FrameEncoder](../type-aliases/FrameEncoder.md) produced.

## Extends

- [`DualExportResult`](DualExportResult.md)

## Properties

### astro

> `readonly` **astro**: `ExportNode`

Defined in: [stage/src/dual-export.ts:444](https://github.com/heyoub/LiteShip/blob/main/packages/stage/src/dual-export.ts#L444)

The static-page carrier (`carrier: 'astro-page'`).

#### Inherited from

[`DualExportResult`](DualExportResult.md).[`astro`](DualExportResult.md#astro)

***

### astroReceipt

> `readonly` **astroReceipt**: `ReceiptEnvelope`

Defined in: [stage/src/dual-export.ts:448](https://github.com/heyoub/LiteShip/blob/main/packages/stage/src/dual-export.ts#L448)

Per-cast child receipts (genesis envelopes), kept for replay/audit.

#### Inherited from

[`DualExportResult`](DualExportResult.md).[`astroReceipt`](DualExportResult.md#astroreceipt)

***

### bytesDigest

> `readonly` **bytesDigest**: `AddressedDigest`

Defined in: [stage/src/dual-export.ts:553](https://github.com/heyoub/LiteShip/blob/main/packages/stage/src/dual-export.ts#L553)

Content address of the encoded container bytes (the mp4 byte stream).

***

### encoded

> `readonly` **encoded**: [`EncodedVideo`](EncodedVideo.md)

Defined in: [stage/src/dual-export.ts:551](https://github.com/heyoub/LiteShip/blob/main/packages/stage/src/dual-export.ts#L551)

The real encoded video (a validatable MP4 when the ffmpeg adapter is used).
This rides ALONGSIDE the proof — the proof's `video` carrier remains a
content address of the produced FRAMES, never the encoded bytes, so the
page-digest == video-source-digest invariant is identical to [dualExport](../functions/dualExport.md).

***

### receipt

> `readonly` **receipt**: `ReceiptEnvelope`

Defined in: [stage/src/dual-export.ts:455](https://github.com/heyoub/LiteShip/blob/main/packages/stage/src/dual-export.ts#L455)

The single assertable head: a parent MERGE envelope whose
`previous = [astroReceipt.hash, videoReceipt.hash]` and whose payload pins
`sharedSourceDigest`. Both child casts resolve to the same `graph.id`.

#### Inherited from

[`DualExportResult`](DualExportResult.md).[`receipt`](DualExportResult.md#receipt)

***

### sharedSourceDigest

> `readonly` **sharedSourceDigest**: `AddressedDigest`

Defined in: [stage/src/dual-export.ts:442](https://github.com/heyoub/LiteShip/blob/main/packages/stage/src/dual-export.ts#L442)

The ONE source digest both casts derive from — `=== graph.digest`.

#### Inherited from

[`DualExportResult`](DualExportResult.md).[`sharedSourceDigest`](DualExportResult.md#sharedsourcedigest)

***

### video

> `readonly` **video**: `ExportNode`

Defined in: [stage/src/dual-export.ts:446](https://github.com/heyoub/LiteShip/blob/main/packages/stage/src/dual-export.ts#L446)

The video carrier (`carrier: 'video'`).

#### Inherited from

[`DualExportResult`](DualExportResult.md).[`video`](DualExportResult.md#video)

***

### videoReceipt

> `readonly` **videoReceipt**: `ReceiptEnvelope`

Defined in: [stage/src/dual-export.ts:449](https://github.com/heyoub/LiteShip/blob/main/packages/stage/src/dual-export.ts#L449)

#### Inherited from

[`DualExportResult`](DualExportResult.md).[`videoReceipt`](DualExportResult.md#videoreceipt)
