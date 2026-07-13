[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / discreteTransitionPayload

# Function: discreteTransitionPayload()

> **discreteTransitionPayload**(`transition`): `Effect`\<`TypedRefShape`\>

Defined in: [core/src/state-transition.ts:91](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/state-transition.ts#L91)

The receipt PAYLOAD ref for a transition — a [TypedRef](../variables/TypedRef.md) over the crossing VALUE
(`cell`/`previous`/`next`/`generation`/`authority`/`base`/`resultId`/`kind`). The SINGLE
source of the payload law (Law 6): both the mint ([transitionReceipt](transitionReceipt.md)) AND the
client-side attestation-check (`recordStreamPatchReceipt`) derive the payload from HERE.
The subject law binds a receipt to a `(base, cell)` pair; THIS binds it to the exact
value, so a self-consistent receipt cannot be re-paired with a DIFFERENT `next`/
`generation`/`resultId` on the same subject.

## Parameters

### transition

[`DiscreteStateTransition`](../interfaces/DiscreteStateTransition.md)

## Returns

`Effect`\<`TypedRefShape`\>
