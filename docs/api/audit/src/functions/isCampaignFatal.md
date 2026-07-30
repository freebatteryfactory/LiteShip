[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / isCampaignFatal

# Function: isCampaignFatal()

> **isCampaignFatal**(`error`): `boolean`

Defined in: [audit/src/mutation-verdict.ts:346](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/mutation-verdict.ts#L346)

The runner's non-recoverable marker: a thrown error carrying `campaignFatal:
true` names corrupted state the campaign cannot safely continue over (the
production runner sets it when the post-mutant RESTORE of the original bytes
failed or did not verify — a mutated trust-spine file may be on disk). Any
other runner throw is a per-mutant refusal and folds to `inconclusive`.

## Parameters

### error

`unknown`

## Returns

`boolean`
