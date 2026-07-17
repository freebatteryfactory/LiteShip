[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / parseErrorFromIssues

# Function: parseErrorFromIssues()

> **parseErrorFromIssues**(`issues`, `source?`): [`ParseError`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts)

Defined in: [core/src/schema/decode.ts:346](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/schema/decode.ts#L346)

Fold a [DecodeIssue](../interfaces/DecodeIssue.md) list into a single tagged `ParseError` (the value-or-
tagged-error shape a sync validator returns). The first issue's `code` and
path lead the message; `source` names the contract that failed.

## Parameters

### issues

readonly [`DecodeIssue`](../interfaces/DecodeIssue.md)[]

### source?

`string` = `'schema'`

## Returns

[`ParseError`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/error/src/variants.ts)
