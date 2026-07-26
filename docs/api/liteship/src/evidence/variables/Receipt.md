[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/evidence](../README.md) / Receipt

# Variable: Receipt

> `const` **Receipt**: `object`

Defined in: core/dist/evidence/receipt.d.ts:355

Receipt namespace -- chain validation and envelope construction.

Build, validate, append, query, and sign linear receipt chains.
Each envelope is content-addressed and linked to its predecessor.
Supports HMAC signing/verification for tamper detection.

## Type Declaration

### append

> **append**: *typeof* `append`

### buildChain

> **buildChain**: *typeof* `buildChain`

### createEnvelope

> **createEnvelope**: *typeof* `createEnvelope`

### findByHash

> **findByHash**: *typeof* `findByHash`

### findByKind

> **findByKind**: *typeof* `findByKind`

### generateMACKey

> **generateMACKey**: *typeof* `generateMACKey`

### GENESIS

> **GENESIS**: `string`

### hashEnvelope

> **hashEnvelope**: *typeof* `hashEnvelope`

### head

> **head**: *typeof* `head`

### isGenesis

> **isGenesis**: *typeof* `isGenesis`

### macEnvelope

> **macEnvelope**: *typeof* `macEnvelope`

### tail

> **tail**: *typeof* `tail`

### validateChain

> **validateChain**: *typeof* `validateChain`

### validateChainDetailed

> **validateChainDetailed**: *typeof* `validateChainDetailed`

### verifyMAC

> **verifyMAC**: *typeof* `verifyMAC`

## Example

```ts
import { Receipt, HLC } from '@liteship/core';

const ts = HLC.increment(HLC.create('node-1'), Date.now());
const chain = await Receipt.buildChain([
  { kind: 'init', subject: { type: 'effect', id: 'a' }, payload, timestamp: ts },
]);
const valid = await Receipt.validateChain(chain);
const latest = Receipt.head(chain);
```
