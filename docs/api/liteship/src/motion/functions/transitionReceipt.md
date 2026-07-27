[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/motion](../README.md) / transitionReceipt

# Function: transitionReceipt()

> **transitionReceipt**(`transition`, `options?`): `Promise`\<[`ReceiptEnvelope`](../../evidence/interfaces/ReceiptEnvelope.md)\>

Defined in: core/dist/motion/state-transition.d.ts:92

Mint a receipt for a [DiscreteStateTransition](../interfaces/DiscreteStateTransition.md), mirroring
`GraphPatch.receipt` byte-for-byte: a single genesis-or-linked envelope
whose payload is a `TypedRef` over the transition, subject-keyed by the
`(base, cell)` law. Async (`Promise`-returning) because the receipt byte law
hashes via `crypto.subtle` (SHA-256) — the same async kernel
`Receipt.createEnvelope` rides on; folding it to a sync value would force a
second, divergent hashing path (Law 4). `timestamp`/`previous` default to a
genesis stamp; pass them to chain this transition onto a prior receipt.

## Parameters

### transition

[`DiscreteStateTransition`](../interfaces/DiscreteStateTransition.md)

### options?

#### previous?

`string` \| readonly `string`[]

#### timestamp?

[`HLCBrand`](../../schema/interfaces/HLCBrand.md)

## Returns

`Promise`\<[`ReceiptEnvelope`](../../evidence/interfaces/ReceiptEnvelope.md)\>
