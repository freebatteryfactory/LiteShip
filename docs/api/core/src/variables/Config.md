[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Config

# Variable: Config

> `const` **Config**: `object`

Defined in: [core/src/authoring/config.ts:53](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/config.ts#L53)

Config namespace — the single hub that every liteship adapter (Vite, Astro, test
runners, edge runtime) projects from. Construction lives in the standalone
[defineConfig](../functions/defineConfig.md), which produces a frozen, FNV-1a content-addressed
Config; every projection function here (`toViteConfig`, `toAstroConfig`,
`toTestAliases`) is pure.

## Type Declaration

### toAstroConfig()

> **toAstroConfig**(`cfg`): [`CoreAstroConfig`](../interfaces/CoreAstroConfig.md)

Project the Astro-integration slice of a config for `@liteship/astro`.

#### Parameters

##### cfg

[`Config`](../interfaces/Config.md)

#### Returns

[`CoreAstroConfig`](../interfaces/CoreAstroConfig.md)

### toTestAliases()

> **toTestAliases**(`cfg`, `repoRoot`): `Record`\<`string`, `string`\>

Materialize the `@liteship/*` → source-path alias map used by the vitest runner.

#### Parameters

##### cfg

[`Config`](../interfaces/Config.md)

##### repoRoot

`string`

#### Returns

`Record`\<`string`, `string`\>

### toViteConfig()

> **toViteConfig**(`cfg`): [`CorePluginConfig`](../interfaces/CorePluginConfig.md)

Project the Vite-plugin slice of a config for `@liteship/vite`.

#### Parameters

##### cfg

[`Config`](../interfaces/Config.md)

#### Returns

[`CorePluginConfig`](../interfaces/CorePluginConfig.md)
