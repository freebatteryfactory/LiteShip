[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / proposalSubject

# Function: proposalSubject()

> **proposalSubject**\<`T`\>(`proposal`): `ContentAddress`

Defined in: [core/src/evidence/validated-output.ts:175](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/evidence/validated-output.ts#L175)

The content address (== receipt subject id) of a validated proposal. Exposed
so a host can cite/cache a proposal by identity without touching the branded
token.

## Type Parameters

### T

`T`

## Parameters

### proposal

[`ValidatedProposal`](../interfaces/ValidatedProposal.md)\<`T`\>

## Returns

`ContentAddress`
