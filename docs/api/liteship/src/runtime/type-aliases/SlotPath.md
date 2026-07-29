[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / SlotPath

# Type Alias: SlotPath

> **SlotPath** = (`value`) => `SlotPath`

Defined in: web/dist/types.d.ts:15

Brand an already-validated slot path string.

Sanctioned single-site cast for `SlotPath`. Callers that have externally
validated the shape (e.g. via `SlotAddressing.isValid`, attribute provenance,
or a literal `/...` template) should use this helper instead of inline-casting.

## Parameters

### value

`string`

## Returns

`SlotPath`
