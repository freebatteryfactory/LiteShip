[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / transitionReceipt

# Function: transitionReceipt()

> **transitionReceipt**(`transition`, `options?`): `Effect`\<[`ReceiptEnvelope`](../interfaces/ReceiptEnvelope.md)\>

Defined in: [core/src/state-transition.ts:114](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/state-transition.ts#L114)

Mint a receipt for a [DiscreteStateTransition](../interfaces/DiscreteStateTransition.md), mirroring
[GraphPatch.receipt](../variables/GraphPatch.md#receipt) byte-for-byte: a single genesis-or-linked envelope
whose payload is a [TypedRef](../variables/TypedRef.md) over the transition, subject-keyed by the
`(base, cell)` law. Effect-returning because the receipt byte law hashes via
`crypto.subtle` (SHA-256) — the same async kernel `Receipt.createEnvelope`
rides on; folding it to a sync value would force a second, divergent hashing
path (Law 4). `timestamp`/`previous` default to a genesis stamp; pass them to
chain this transition onto a prior receipt.

## Parameters

### transition

[`DiscreteStateTransition`](../interfaces/DiscreteStateTransition.md)

### options?

#### previous?

`string` \| readonly `string`[]

#### timestamp?

[`HLCBrand`](../interfaces/HLCBrand.md)

## Returns

`Effect`\<[`ReceiptEnvelope`](../interfaces/ReceiptEnvelope.md)\>
