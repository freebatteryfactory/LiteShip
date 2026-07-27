[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / inspectReceipt

# Function: inspectReceipt()

> **inspectReceipt**(`envelope`): [`ReceiptInspection`](../interfaces/ReceiptInspection.md)

Defined in: [core/src/evidence/receipt.ts:628](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/receipt.ts#L628)

Return a structured, human-debuggable view of a receipt envelope (verb grammar,
ADR-0046 — `inspect` returns structured debug information). A thin, synchronous
facade over the existing [Receipt](../variables/Receipt.md) namespace: it derives the causal facts
(genesis/merge/signed classification, normalized predecessor links) a caller
reads when tracing a chain link, WITHOUT recomputing the hash or touching I/O.

## Parameters

### envelope

[`ReceiptEnvelope`](../interfaces/ReceiptEnvelope.md)

## Returns

[`ReceiptInspection`](../interfaces/ReceiptInspection.md)

## Example

```ts
import { inspectReceipt } from '@liteship/core';

const view = inspectReceipt(chain[0]);
// { kind, subject, hash, previous, isGenesis: true, isMerge: false, signed, timestamp }
```
