[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / symbolIdOfOrphanFact

# Function: symbolIdOfOrphanFact()

> **symbolIdOfOrphanFact**(`file`, `value`): `string`

Defined in: [audit/src/repo-ir-language-service.ts:320](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/repo-ir-language-service.ts#L320)

Reconstruct the IR [SymbolId](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/repo-ir.ts) (`<file>#<name>`) a `symbol-orphan` fact
concerns, from the fact's `file` and its structured [OrphanValue](../interfaces/OrphanValue.md) `name`.
Exported so the divergence gate JOINS the symbol-evidenced facts against the
IR's `refs` reverse index (which is keyed on the same convention) WITHOUT the
gate re-deriving the convention — one source of the key shape.

## Parameters

### file

`string`

### value

[`OrphanValue`](../interfaces/OrphanValue.md)

## Returns

`string`
