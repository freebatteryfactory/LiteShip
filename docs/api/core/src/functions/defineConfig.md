[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / defineConfig

# Function: defineConfig()

> **defineConfig**(`input`): [`Config`](../interfaces/Config.md)

Defined in: [core/src/authoring/config.ts:204](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/config.ts#L204)

Define a liteship [Config](../variables/Config.md) — the single project-configuration hub every
adapter (Vite, Astro, test runners, edge runtime) projects from. Produces a
frozen, FNV-1a content-addressed value from raw [ConfigInput](../interfaces/ConfigInput.md).

## Parameters

### input

[`ConfigInput`](../interfaces/ConfigInput.md)

## Returns

[`Config`](../interfaces/Config.md)
