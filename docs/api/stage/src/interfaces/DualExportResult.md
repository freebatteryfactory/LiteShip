[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [stage/src](../README.md) / DualExportResult

# Interface: DualExportResult

Defined in: [stage/src/dual-export.ts:468](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L468)

The provable result of casting one graph to two carriers from one source.

## Extended by

- [`DualExportNodeResult`](DualExportNodeResult.md)

## Properties

### astro

> `readonly` **astro**: [`ExportNode`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts)

Defined in: [stage/src/dual-export.ts:472](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L472)

The static-page carrier (`carrier: 'astro-page'`).

***

### astroReceipt

> `readonly` **astroReceipt**: `ReceiptEnvelope`

Defined in: [stage/src/dual-export.ts:476](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L476)

Per-cast child receipts (genesis envelopes), kept for replay/audit.

***

### receipt

> `readonly` **receipt**: `ReceiptEnvelope`

Defined in: [stage/src/dual-export.ts:483](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L483)

The single assertable head: a parent MERGE envelope whose
`previous = [astroReceipt.hash, videoReceipt.hash]` and whose payload pins
`sharedSourceDigest`. Both child casts resolve to the same `graph.id`.

***

### sharedSourceDigest

> `readonly` **sharedSourceDigest**: `AddressedDigest`

Defined in: [stage/src/dual-export.ts:470](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L470)

The ONE source digest both casts derive from — `=== graph.digest`.

***

### video

> `readonly` **video**: [`ExportNode`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts)

Defined in: [stage/src/dual-export.ts:474](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L474)

The video carrier (`carrier: 'video'`).

***

### videoReceipt

> `readonly` **videoReceipt**: `ReceiptEnvelope`

Defined in: [stage/src/dual-export.ts:477](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L477)
