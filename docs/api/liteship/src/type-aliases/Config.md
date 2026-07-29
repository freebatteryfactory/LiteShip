[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [liteship/src](../README.md) / Config

# Type Alias: Config

> **Config** = `object`

Defined in: core/dist/authoring/config.d.ts:40

Config namespace — the single hub that every liteship adapter (Vite, Astro, test
runners, edge runtime) projects from. Construction lives in the standalone
[defineConfig](../functions/defineConfig.md), which produces a frozen, FNV-1a content-addressed
Config; every projection function here (`toViteConfig`, `toAstroConfig`,
`toTestAliases`) is pure.

## Methods

### toAstroConfig()

> **toAstroConfig**(`cfg`): `AstroConfig`

Defined in: core/dist/authoring/config.d.ts:44

Project the Astro-integration slice of a config for `@liteship/astro`.

#### Parameters

##### cfg

`Config`

#### Returns

`AstroConfig`

***

### toTestAliases()

> **toTestAliases**(`cfg`, `repoRoot`): `Record`\<`string`, `string`\>

Defined in: core/dist/authoring/config.d.ts:46

Materialize the `@liteship/*` → source-path alias map used by the vitest runner.

#### Parameters

##### cfg

`Config`

##### repoRoot

`string`

#### Returns

`Record`\<`string`, `string`\>

***

### toViteConfig()

> **toViteConfig**(`cfg`): `PluginConfig`

Defined in: core/dist/authoring/config.d.ts:42

Project the Vite-plugin slice of a config for `@liteship/vite`.

#### Parameters

##### cfg

`Config`

#### Returns

`PluginConfig`
