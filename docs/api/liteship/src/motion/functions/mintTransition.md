[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/motion](../README.md) / mintTransition

# Function: mintTransition()

> **mintTransition**(`previous`, `next`, `options`): `Promise`\<\{ `receipt`: [`ReceiptEnvelope`](../../evidence/interfaces/ReceiptEnvelope.md); `transition`: [`DiscreteStateTransition`](../interfaces/DiscreteStateTransition.md); \}\>

Defined in: core/dist/motion/state-transition.d.ts:103

Companion mint the authority host calls AFTER a synchronous
[StateCellStore.applyDiscrete](../../reactive/interfaces/StateCellStore.md#applydiscrete) — builds the transition VALUE from
the crossing's `previous`/`next` cells plus the graph identity, then mints its
receipt via [transitionReceipt](transitionReceipt.md). Kept separate so `applyDiscrete` stays
synchronous (no crypto in the hot path).

## Parameters

### previous

[`StateCell`](../../reactive/interfaces/StateCell.md)\<`string`\> \| `undefined`

### next

[`StateCell`](../../reactive/interfaces/StateCell.md)

### options

#### base

[`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

#### previousHash?

`string` \| readonly `string`[]

#### resultId?

[`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

#### timestamp?

[`HLCBrand`](../../schema/interfaces/HLCBrand.md)

## Returns

`Promise`\<\{ `receipt`: [`ReceiptEnvelope`](../../evidence/interfaces/ReceiptEnvelope.md); `transition`: [`DiscreteStateTransition`](../interfaces/DiscreteStateTransition.md); \}\>
