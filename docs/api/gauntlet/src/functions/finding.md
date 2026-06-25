[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / finding

# Function: finding()

> **finding**(`input`): [`Finding`](../interfaces/Finding.md)

Defined in: [gauntlet/src/finding.ts:95](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/finding.ts#L95)

Build a [Finding](../interfaces/Finding.md) — the one composer. Drops `undefined` optional fields
so two findings with the same meaning are structurally equal (stable reports,
content-addressable results).

## Parameters

### input

[`FindingInput`](../interfaces/FindingInput.md)

## Returns

[`Finding`](../interfaces/Finding.md)
