[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [liteship/src](../README.md) / defineConfig

# Function: defineConfig()

> **defineConfig**(`input`): [`Config`](../type-aliases/Config.md)

Defined in: core/dist/authoring/config.d.ts:73

Define a liteship [Config](../type-aliases/Config.md) — the single project-configuration hub every
adapter (Vite, Astro, test runners, edge runtime) projects from. Produces a
frozen, FNV-1a content-addressed value from raw [ConfigInput](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/config.ts).

## Parameters

### input

[`ConfigInput`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/config.ts)

## Returns

[`Config`](../type-aliases/Config.md)
