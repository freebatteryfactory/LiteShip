[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / detectEarlyReturnBeforeExpectAST

# Function: detectEarlyReturnBeforeExpectAST()

> **detectEarlyReturnBeforeExpectAST**(`source`): readonly [`EarlyReturnMatch`](../interfaces/EarlyReturnMatch.md)[]

Defined in: [audit/src/skip-detect-ast.ts:1295](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/skip-detect-ast.ts#L1295)

Find test branches that can return before reaching an assertion.

## Parameters

### source

`string`

## Returns

readonly [`EarlyReturnMatch`](../interfaces/EarlyReturnMatch.md)[]
