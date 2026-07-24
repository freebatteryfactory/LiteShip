[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / plugin

# Function: plugin()

> **plugin**(`config?`, `resolvePackaged?`, `projectConfigLoader?`): `Plugin`

Defined in: [vite/src/plugin.ts:197](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/plugin.ts#L197)

Create the liteship Vite plugin.

Transforms CSS files containing `@token`, `@theme`, `@style`, and
`@quantize` blocks into native CSS custom properties,
`html[data-theme]` selectors, scoped `@layer` / `@scope` rules, and
`@container` queries respectively. Uses convention-based definition
resolution and provides HMR support for surgical CSS and shader
uniform updates.

## Parameters

### config?

[`PluginConfig`](../interfaces/PluginConfig.md)

### resolvePackaged?

() => `string` \| `null`

### projectConfigLoader?

(`configEnv`, `configFile?`, `configRoot?`, `logLevel?`, `customLogger?`, `configLoader?`) => `Promise`\<\{ \} \| `null`\>

## Returns

`Plugin`

## Example

```ts
// vite.config.ts
import { liteship } from '@liteship/vite';
const config = { plugins: [liteship()] };
```

`resolvePackaged` is an internal seam: the packaged-`@liteship/core` binary
resolver, defaulting to the real [resolvePackagedWasm](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/wasm-package-resolve.ts). Production leaves
it defaulted (call sites are `plugin(config)`, byte-identical); a test injects a
stub to force the `'package'` WASM source absent against a synthetic project root.
