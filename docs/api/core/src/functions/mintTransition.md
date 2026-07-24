[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / mintTransition

# Function: mintTransition()

> **mintTransition**(`previous`, `next`, `options`): `Promise`\<\{ `receipt`: [`ReceiptEnvelope`](../interfaces/ReceiptEnvelope.md); `transition`: [`DiscreteStateTransition`](../interfaces/DiscreteStateTransition.md); \}\>

Defined in: [core/src/motion/state-transition.ts:136](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/state-transition.ts#L136)

Companion mint the authority host calls AFTER a synchronous
[StateCellStoreShape.applyDiscrete](../interfaces/StateCellStoreShape.md#applydiscrete) — builds the transition VALUE from
the crossing's `previous`/`next` cells plus the graph identity, then mints its
receipt via [transitionReceipt](transitionReceipt.md). Kept separate so `applyDiscrete` stays
synchronous (no crypto in the hot path).

## Parameters

### previous

[`StateCell`](../interfaces/StateCell.md)\<`string`\> \| `undefined`

### next

[`StateCell`](../interfaces/StateCell.md)

### options

#### base

`ContentAddress`

#### previousHash?

`string` \| readonly `string`[]

#### resultId?

`ContentAddress`

#### timestamp?

[`HLCBrand`](../interfaces/HLCBrand.md)

## Returns

`Promise`\<\{ `receipt`: [`ReceiptEnvelope`](../interfaces/ReceiptEnvelope.md); `transition`: [`DiscreteStateTransition`](../interfaces/DiscreteStateTransition.md); \}\>
