[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / typeDirectedCompilerOptions

# Function: typeDirectedCompilerOptions()

> **typeDirectedCompilerOptions**(`baseUrl`): [`CompilerOptions`](https://www.typescriptlang.org/docs/handbook/compiler-options.html)

Defined in: [audit/src/ts-program.ts:64](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/ts-program.ts#L64)

Build the shared [ts.CompilerOptions](https://www.typescriptlang.org/docs/handbook/compiler-options.html) for a type-directed program rooted
at `baseUrl` (the repo root the `@czap/*` aliases resolve against). The options
are the proven capsule-detector configuration: strict, bundler resolution, the
`.ts`-source alias `paths`, and `noEmit` (the program is for the checker only).

## Parameters

### baseUrl

`string`

## Returns

[`CompilerOptions`](https://www.typescriptlang.org/docs/handbook/compiler-options.html)
