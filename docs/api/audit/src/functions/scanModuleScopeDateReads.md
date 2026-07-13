[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / scanModuleScopeDateReads

# Function: scanModuleScopeDateReads()

> **scanModuleScopeDateReads**(`source`, `fileName?`): readonly [`ModuleScopeDateHit`](../interfaces/ModuleScopeDateHit.md)[]

Defined in: [audit/src/workers-date-scan.ts:246](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/workers-date-scan.ts#L246)

THE PUBLIC ENTRY — every MODULE-LOAD ambient-Date read in `source`, each with its 1-based line/column.
Shared by the doctor probe and the consumer-app audit so both agree on ONE definition (Law 6). Returns
`[]` when the file reads the clock only inside deferred (call-time) bodies — the safe pattern.

`fileName` only selects the parse mode (`.tsx`/`.jsx` → JSX); the scan is independent of the path.

## Parameters

### source

`string`

### fileName?

`string` = `'module.ts'`

## Returns

readonly [`ModuleScopeDateHit`](../interfaces/ModuleScopeDateHit.md)[]
