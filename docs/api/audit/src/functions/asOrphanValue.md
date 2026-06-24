[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / asOrphanValue

# Function: asOrphanValue()

> **asOrphanValue**(`value`): [`OrphanValue`](../interfaces/OrphanValue.md) \| `undefined`

Defined in: [audit/src/repo-ir-language-service.ts:330](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/repo-ir-language-service.ts#L330)

Narrow a [Fact](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts)'s `unknown` value to [OrphanValue](../interfaces/OrphanValue.md) — the guard a
consumer MUST pass before reading a `symbol-orphan` fact's payload (the value
is `unknown` precisely to force this). Returns `undefined` for any other shape
(never throws — a malformed fact is simply not an orphan observation).

## Parameters

### value

`unknown`

## Returns

[`OrphanValue`](../interfaces/OrphanValue.md) \| `undefined`
