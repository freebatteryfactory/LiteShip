[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ReceiptInspection

# Interface: ReceiptInspection

Defined in: [core/src/evidence/receipt.ts:594](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/receipt.ts#L594)

A structured, human-debuggable view of one [ReceiptEnvelope](ReceiptEnvelope.md) — the shape
[inspectReceipt](../functions/inspectReceipt.md) returns. Purely derived (no hashing, no I/O): the causal
facts a caller reads when tracing a chain link.

## Properties

### hash

> `readonly` **hash**: `string`

Defined in: [core/src/evidence/receipt.ts:600](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/receipt.ts#L600)

The envelope's content hash (SHA-256 hex).

***

### isGenesis

> `readonly` **isGenesis**: `boolean`

Defined in: [core/src/evidence/receipt.ts:604](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/receipt.ts#L604)

True when this is a genesis (root) envelope — `previous` includes the `GENESIS` sentinel.

***

### isMerge

> `readonly` **isMerge**: `boolean`

Defined in: [core/src/evidence/receipt.ts:606](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/receipt.ts#L606)

True when this is a merge envelope — it names more than one predecessor.

***

### kind

> `readonly` **kind**: `string`

Defined in: [core/src/evidence/receipt.ts:596](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/receipt.ts#L596)

The envelope's semantic kind (e.g. `'state-change'`, `'checkpoint'`).

***

### previous

> `readonly` **previous**: readonly `string`[]

Defined in: [core/src/evidence/receipt.ts:602](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/receipt.ts#L602)

The predecessor link(s), always normalized to an array (single or merge).

***

### signed

> `readonly` **signed**: `boolean`

Defined in: [core/src/evidence/receipt.ts:608](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/receipt.ts#L608)

True when the envelope carries a MAC `signature`.

***

### subject

> `readonly` **subject**: [`ReceiptSubject`](ReceiptSubject.md)

Defined in: [core/src/evidence/receipt.ts:598](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/receipt.ts#L598)

The logical entity the receipt describes.

***

### timestamp

> `readonly` **timestamp**: [`HLCBrand`](HLCBrand.md)

Defined in: [core/src/evidence/receipt.ts:610](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/receipt.ts#L610)

The causal clock stamped on the envelope.
