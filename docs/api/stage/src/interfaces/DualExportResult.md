[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [stage/src](../README.md) / DualExportResult

# Interface: DualExportResult

Defined in: [stage/src/dual-export.ts:534](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L534)

The provable result of casting one graph to two carriers from one source.

## Extended by

- [`DualExportNodeResult`](DualExportNodeResult.md)

## Properties

### astro

> `readonly` **astro**: [`ExportNode`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts)

Defined in: [stage/src/dual-export.ts:538](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L538)

The static-page carrier (`carrier: 'astro-page'`).

***

### astroReceipt

> `readonly` **astroReceipt**: `ReceiptEnvelope`

Defined in: [stage/src/dual-export.ts:542](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L542)

Per-cast child receipts (genesis envelopes), kept for replay/audit.

***

### receipt

> `readonly` **receipt**: `ReceiptEnvelope`

Defined in: [stage/src/dual-export.ts:549](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L549)

The single assertable head: a parent MERGE envelope whose
`previous = [astroReceipt.hash, videoReceipt.hash]` and whose payload pins
`sharedSourceDigest`. Both child casts resolve to the same `graph.id`.

***

### sharedSourceDigest

> `readonly` **sharedSourceDigest**: `AddressedDigest`

Defined in: [stage/src/dual-export.ts:536](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L536)

The ONE source digest both casts derive from — `=== graph.digest`.

***

### video

> `readonly` **video**: [`ExportNode`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/graph/document-graph.ts)

Defined in: [stage/src/dual-export.ts:540](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L540)

The video carrier (`carrier: 'video'`).

***

### videoReceipt

> `readonly` **videoReceipt**: `ReceiptEnvelope`

Defined in: [stage/src/dual-export.ts:543](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/stage/src/dual-export.ts#L543)
