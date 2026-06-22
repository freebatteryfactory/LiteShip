[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / WORKSPACE\_ALIASES

# Variable: WORKSPACE\_ALIASES

> `const` **WORKSPACE\_ALIASES**: `Readonly`\<`Record`\<`string`, readonly `string`[]\>\>

Defined in: [audit/src/ts-program.ts:25](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/ts-program.ts#L25)

Workspace `@czap/*` → source-tree path map. Mirrors `Config.toTestAliases` so
the type checker resolves cross-package imports to source `.ts` files, not
built `.d.ts` files (the ".ts source not .d.ts" trick). Drift against
`Config.toTestAliases` is pinned by `tests/unit/capsule-detector.test.ts`.
