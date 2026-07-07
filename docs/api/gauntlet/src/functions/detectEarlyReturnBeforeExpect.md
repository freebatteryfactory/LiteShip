[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / detectEarlyReturnBeforeExpect

# Function: detectEarlyReturnBeforeExpect()

> **detectEarlyReturnBeforeExpect**(`source`): readonly [`EarlyReturnMatch`](../interfaces/EarlyReturnMatch.md)[]

Defined in: [gauntlet/src/gates/early-return-detect.ts:18](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gates/early-return-detect.ts#L18)

Best-effort scan for `return;` inside `it(` / `test(` callbacks before `expect(`.
The AST detector (`detectEarlyReturnBeforeExpectAST`) is authoritative when injected.

## Parameters

### source

`string`

## Returns

readonly [`EarlyReturnMatch`](../interfaces/EarlyReturnMatch.md)[]
