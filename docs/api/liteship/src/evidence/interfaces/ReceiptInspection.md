[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/evidence](../README.md) / ReceiptInspection

# Interface: ReceiptInspection

Defined in: core/dist/evidence/receipt.d.ts:302

A structured, human-debuggable view of one [ReceiptEnvelope](ReceiptEnvelope.md) — the shape
[inspectReceipt](../variables/inspectReceipt.md) returns. Purely derived (no hashing, no I/O): the causal
facts a caller reads when tracing a chain link.

## Properties

### hash

> `readonly` **hash**: `string`

Defined in: core/dist/evidence/receipt.d.ts:308

The envelope's content hash (SHA-256 hex).

***

### isGenesis

> `readonly` **isGenesis**: `boolean`

Defined in: core/dist/evidence/receipt.d.ts:312

True when this is a genesis (root) envelope — `previous` includes the `GENESIS` sentinel.

***

### isMerge

> `readonly` **isMerge**: `boolean`

Defined in: core/dist/evidence/receipt.d.ts:314

True when this is a merge envelope — it names more than one predecessor.

***

### kind

> `readonly` **kind**: `string`

Defined in: core/dist/evidence/receipt.d.ts:304

The envelope's semantic kind (e.g. `'state-change'`, `'checkpoint'`).

***

### previous

> `readonly` **previous**: readonly `string`[]

Defined in: core/dist/evidence/receipt.d.ts:310

The predecessor link(s), always normalized to an array (single or merge).

***

### signed

> `readonly` **signed**: `boolean`

Defined in: core/dist/evidence/receipt.d.ts:316

True when the envelope carries a MAC `signature`.

***

### subject

> `readonly` **subject**: [`ReceiptSubject`](ReceiptSubject.md)

Defined in: core/dist/evidence/receipt.d.ts:306

The logical entity the receipt describes.

***

### timestamp

> `readonly` **timestamp**: [`HLCBrand`](../../schema/interfaces/HLCBrand.md)

Defined in: core/dist/evidence/receipt.d.ts:318

The causal clock stamped on the envelope.
