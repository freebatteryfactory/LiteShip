[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [web/src](../README.md) / SlotPath

# Type Alias: SlotPath

> **SlotPath** = (`value`) => `SlotPath`

Defined in: [web/src/slot/addressing.ts:14](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/slot/addressing.ts#L14)

Brand an already-validated slot path string.

Sanctioned single-site cast for `SlotPath`. Callers that have externally
validated the shape (e.g. via [SlotAddressing.isValid](../variables/SlotAddressing.md#isvalid), attribute
provenance, or a literal `/...` template) should use this helper instead of
inline-casting.

## Parameters

### value

`string`

## Returns

`SlotPath`
