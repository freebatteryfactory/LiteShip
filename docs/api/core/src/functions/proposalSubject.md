[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / proposalSubject

# Function: proposalSubject()

> **proposalSubject**\<`T`\>(`proposal`): `ContentAddress`

Defined in: [core/src/validated-output.ts:125](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/validated-output.ts#L125)

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
