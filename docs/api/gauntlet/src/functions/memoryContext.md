[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / memoryContext

# Function: memoryContext()

> **memoryContext**(`files`, `repoRoot?`): [`GateContext`](../interfaces/GateContext.md)

Defined in: [gauntlet/src/engine.ts:467](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/engine.ts#L467)

An in-memory [GateContext](../interfaces/GateContext.md) over a `path → text` map — the substrate for
fixtures and tests. A gate written against [GateContext](../interfaces/GateContext.md) runs against
this identically to the real repo, so red/green fixtures need no filesystem.

## Parameters

### files

`Readonly`\<`Record`\<`string`, `string`\>\>

### repoRoot?

`string` = `'/virtual'`

## Returns

[`GateContext`](../interfaces/GateContext.md)
