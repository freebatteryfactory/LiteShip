[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [core/src](../README.md) / discreteTransitionSubjectId

# Function: discreteTransitionSubjectId()

> **discreteTransitionSubjectId**(`transition`): `string`

Defined in: [core/src/motion/state-transition.ts:85](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/state-transition.ts#L85)

The receipt subject id for a transition — `${base}#${cell}`. The SINGLE source
of the subject law (Law 6): both the mint ([transitionReceipt](transitionReceipt.md)) and the
client-side attestation-check (`recordStreamPatchReceipt`) derive the expected
subject from HERE, so a receipt for `(base, cellA)` can never be replayed
against `cellB` or another graph.

## Parameters

### transition

`Pick`\<[`DiscreteStateTransition`](../interfaces/DiscreteStateTransition.md), `"base"` \| `"cell"`\>

## Returns

`string`
