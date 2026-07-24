[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / loadProjectConfig

# Function: loadProjectConfig()

> **loadProjectConfig**(`root`, `env`, `loader?`): `Promise`\<[`LoadedProjectConfig`](../interfaces/LoadedProjectConfig.md) \| `null`\>

Defined in: [vite/src/project-config.ts:97](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/project-config.ts#L97)

Load and validate `<root>/liteship.config.ts`. Absence is allowed for the
low-level convention-only Vite plugin; malformed or unevaluable presence is
never converted into an empty config.

## Parameters

### root

`string`

### env

`ConfigEnv`

### loader?

(`configEnv`, `configFile?`, `configRoot?`, `logLevel?`, `customLogger?`, `configLoader?`) => `Promise`\<\{ \} \| `null`\>

## Returns

`Promise`\<[`LoadedProjectConfig`](../interfaces/LoadedProjectConfig.md) \| `null`\>
