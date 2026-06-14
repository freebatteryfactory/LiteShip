[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / assertTokenBinds

# Function: assertTokenBinds()

> **assertTokenBinds**\<`T`\>(`proposal`): `T`

Defined in: [core/src/validated-output.ts:109](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/validated-output.ts#L109)

Host-side guard: re-derive the payload's content address and assert it matches
the token's bound subject. A host's admission layer calls this immediately
before applying — it catches any attempt to swap the payload after minting
(the token binds to the bytes that were validated, not merely to "some
validation happened"). Returns the payload narrowed when bound; throws on
mismatch.

This is defense-in-depth ON TOP of the unforgeable token: even a correctly
minted token cannot be paired with a different payload at apply time.

## Type Parameters

### T

`T`

## Parameters

### proposal

[`ValidatedProposal`](../interfaces/ValidatedProposal.md)\<`T`\>

## Returns

`T`
