[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [stage/src](../README.md) / DualExportResult

# Interface: DualExportResult

Defined in: [stage/src/dual-export.ts:515](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L515)

The provable result of casting one graph to two carriers from one source.

## Extended by

- [`DualExportNodeResult`](DualExportNodeResult.md)

## Properties

### astro

> `readonly` **astro**: [`ExportNode`](../../../liteship/src/graph/interfaces/ExportNode.md)

Defined in: [stage/src/dual-export.ts:519](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L519)

The static-page carrier (`carrier: 'astro-page'`).

***

### astroReceipt

> `readonly` **astroReceipt**: [`ReceiptEnvelope`](../../../liteship/src/evidence/interfaces/ReceiptEnvelope.md)

Defined in: [stage/src/dual-export.ts:523](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L523)

Per-cast child receipts (genesis envelopes), kept for replay/audit.

***

### receipt

> `readonly` **receipt**: [`ReceiptEnvelope`](../../../liteship/src/evidence/interfaces/ReceiptEnvelope.md)

Defined in: [stage/src/dual-export.ts:530](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L530)

The single assertable head: a parent MERGE envelope whose
`previous = [astroReceipt.hash, videoReceipt.hash]` and whose payload pins
`sharedSourceDigest`. Both child casts resolve to the same `graph.id`.

***

### sharedSourceDigest

> `readonly` **sharedSourceDigest**: `AddressedDigest`

Defined in: [stage/src/dual-export.ts:517](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L517)

The ONE source digest both casts derive from — `=== graph.digest`.

***

### video

> `readonly` **video**: [`ExportNode`](../../../liteship/src/graph/interfaces/ExportNode.md)

Defined in: [stage/src/dual-export.ts:521](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L521)

The video carrier (`carrier: 'video'`).

***

### videoReceipt

> `readonly` **videoReceipt**: [`ReceiptEnvelope`](../../../liteship/src/evidence/interfaces/ReceiptEnvelope.md)

Defined in: [stage/src/dual-export.ts:524](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L524)
