[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / governedFiles

# Function: governedFiles()

> **governedFiles**(`context`): readonly `string`[]

Defined in: [gauntlet/src/skip-site-facts.ts:84](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/skip-site-facts.ts#L84)

The governed corpus: the IR-scoped judged `files()` UNIONED with the UNSCOPED `allFiles()`
(the `tests/` tree), minus `tests/generated/`. De-duped + sorted so the fold is deterministic.

## Parameters

### context

[`GateContext`](../interfaces/GateContext.md)

## Returns

readonly `string`[]
