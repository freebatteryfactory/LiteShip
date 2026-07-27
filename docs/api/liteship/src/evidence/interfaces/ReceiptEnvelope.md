[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/evidence](../README.md) / ReceiptEnvelope

# Interface: ReceiptEnvelope

Defined in: core/dist/evidence/receipt.d.ts:20

Single link in a receipt chain: timestamped, content-addressed, and linked
to its predecessor(s). Merge envelopes carry an array of `previous` hashes;
optionally MAC-signed via `Receipt.macEnvelope`.

## Properties

### hash

> `readonly` **hash**: `string`

Defined in: core/dist/evidence/receipt.d.ts:32

***

### kind

> `readonly` **kind**: `string`

Defined in: core/dist/evidence/receipt.d.ts:21

***

### payload

> `readonly` **payload**: `TypedRefShape`

Defined in: core/dist/evidence/receipt.d.ts:31

***

### previous

> `readonly` **previous**: `string` \| readonly `string`[]

Defined in: core/dist/evidence/receipt.d.ts:33

***

### signature?

> `readonly` `optional` **signature?**: `string`

Defined in: core/dist/evidence/receipt.d.ts:34

***

### subject

> `readonly` **subject**: [`ReceiptSubject`](ReceiptSubject.md)

Defined in: core/dist/evidence/receipt.d.ts:30

***

### timestamp

> `readonly` **timestamp**: [`HLCBrand`](../../schema/interfaces/HLCBrand.md)

Defined in: core/dist/evidence/receipt.d.ts:29

Causal clock (CUT B2): an [HLC](../../schema/interfaces/HLCBrand.md), NOT a wall-clock string. It is
INCLUDED in `hashEnvelope` and monotonic-validated by `validateChain`
(`hlc_not_increasing`) — i.e. identity- and ordering-bearing. Not
interchangeable with a `WallClockTimestamp` (the volatile, identity-irrelevant
ISO stamp on command/CLI receipts).
