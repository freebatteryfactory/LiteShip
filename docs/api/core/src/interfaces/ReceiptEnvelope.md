[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ReceiptEnvelope

# Interface: ReceiptEnvelope

Defined in: [core/src/receipt.ts:26](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/receipt.ts#L26)

Single link in a receipt chain: timestamped, content-addressed, and linked
to its predecessor(s). Merge envelopes carry an array of `previous` hashes;
optionally MAC-signed via `Receipt.macEnvelope`.

## Properties

### hash

> `readonly` **hash**: `string`

Defined in: [core/src/receipt.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/receipt.ts#L38)

***

### kind

> `readonly` **kind**: `string`

Defined in: [core/src/receipt.ts:27](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/receipt.ts#L27)

***

### payload

> `readonly` **payload**: `TypedRefShape`

Defined in: [core/src/receipt.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/receipt.ts#L37)

***

### previous

> `readonly` **previous**: `string` \| readonly `string`[]

Defined in: [core/src/receipt.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/receipt.ts#L39)

***

### signature?

> `readonly` `optional` **signature?**: `string`

Defined in: [core/src/receipt.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/receipt.ts#L40)

***

### subject

> `readonly` **subject**: [`ReceiptSubject`](ReceiptSubject.md)

Defined in: [core/src/receipt.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/receipt.ts#L36)

***

### timestamp

> `readonly` **timestamp**: [`HLCBrand`](HLCBrand.md)

Defined in: [core/src/receipt.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/receipt.ts#L35)

Causal clock (CUT B2): an [HLC](HLCBrand.md), NOT a wall-clock string. It is
INCLUDED in `hashEnvelope` and monotonic-validated by `validateChain`
(`hlc_not_increasing`) — i.e. identity- and ordering-bearing. Not
interchangeable with a `WallClockTimestamp` (the volatile, identity-irrelevant
ISO stamp on command/CLI receipts).
