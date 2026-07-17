[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / WORKSPACE\_ALIASES

# Variable: WORKSPACE\_ALIASES

> `const` **WORKSPACE\_ALIASES**: `Readonly`\<`Record`\<`string`, readonly `string`[]\>\>

Defined in: [audit/src/ts-program.ts:32](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/ts-program.ts#L32)

Workspace `@czap/*` → source-tree path map. Mirrors `Config.toTestAliases` so
the type checker resolves cross-package imports to source `.ts` files, not
built `.d.ts` files (the ".ts source not .d.ts" trick). Drift against
`Config.toTestAliases` is pinned by `tests/unit/capsule-detector.test.ts`.

This is one of the `@czap/*` roster copies whose canonical membership owner is
`scripts/gen-roster.ts` (`CANONICAL_ROSTER`). Unlike the full-fleet mirrors it
is deliberately a SUBSET — only the packages whose SOURCE the checker must
resolve carry an entry, and each entry adds hand-authored subpath aliases — so
it is not regenerated verbatim from the roster; the `capsule-detector`
drift-guard keeps it in step with `Config.toTestAliases`.
