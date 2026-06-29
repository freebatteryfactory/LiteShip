[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / assertTokenBinds

# Function: assertTokenBinds()

> **assertTokenBinds**\<`T`\>(`proposal`): `T`

Defined in: [core/src/validated-output.ts:141](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/validated-output.ts#L141)

Host-side guard: re-derive the payload's content address and assert it matches
the token's bound subject. A host's admission layer calls this immediately
before applying — it catches any attempt to swap the payload after minting
(the token binds to the bytes that were validated, not merely to "some
validation happened"). Returns the payload narrowed when bound; throws on
mismatch.

This is defense-in-depth ON TOP of the unforgeable token: even a correctly
minted token cannot be paired with a different payload at apply time.

It enforces, at runtime, the same three properties the type encodes:
 1. PROVENANCE — the token carries the module-private witness, so it was minted
    by [mintValidated](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/validated-output.ts) (a runtime brand check that backs the type-level
    guarantee against a structurally-shaped but un-minted impostor token).
 2. TARGET CONSISTENCY — `token.target === proposal.target` (no target/token
    divergence routing a payload through the wrong validator's authority).
 3. PAYLOAD BINDING — the re-derived content address matches the token subject
    (no post-validation payload swap).

## Type Parameters

### T

`T`

## Parameters

### proposal

[`ValidatedProposal`](../interfaces/ValidatedProposal.md)\<`T`\>

## Returns

`T`
