[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / createTypeDirectedProgram

# Function: createTypeDirectedProgram()

> **createTypeDirectedProgram**(`files`, `baseUrl?`): [`Program`](https://github.com/microsoft/TypeScript/blob/main/src/compiler/types.ts)

Defined in: [audit/src/ts-program.ts:104](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/ts-program.ts#L104)

Build a type-directed [ts.Program](https://github.com/microsoft/TypeScript/blob/main/src/compiler/types.ts) over `files`, rooted at `baseUrl`
(default: `process.cwd()`). `createProgram` resolves transitively imported
files automatically, so the checker sees enough of the repo to resolve
cross-package types + factory wrappers. The single creation site for BOTH the
capsule detector and the repo-IR builder — there is no second config.

## Parameters

### files

readonly `string`[]

### baseUrl?

`string` = `...`

## Returns

[`Program`](https://github.com/microsoft/TypeScript/blob/main/src/compiler/types.ts)
