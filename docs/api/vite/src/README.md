[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / vite/src

# vite/src

`@liteship/vite` — **LiteShip** Vite 8 plugin: turns `@token` / `@theme` /
`@style` / `@quantize` at-rule blocks into native CSS and **rigs** HMR for
`@liteship/*` definitions.

The plugin hooks into Vite's `resolveId`, `load`, `transform`, and
`handleHotUpdate` phases:

- `resolveId` + `load`: map `virtual:liteship/*` specifiers to generated
  modules (device capabilities, WASM URL, ...).
- `transform`: rewrite `@token`, `@theme`, `@style`, and `@quantize`
  at-rule blocks into native CSS (custom properties,
  `html[data-theme]` selectors, scoped `@layer` / `@scope` rules,
  and `@container` queries).
- `handleHotUpdate`: emit surgical HMR payloads so CSS variables,
  shader uniforms, and boundary definitions update without a full
  page reload.

Definitions are discovered by convention (`tokens.ts` / `*.tokens.ts`,
`themes.ts` / `*.themes.ts`, ... next to the referencing file, then at
the project root) — no listing required. Override the search directory
per primitive kind via [PluginConfig.dirs](interfaces/PluginConfig.md#dirs).

## Example

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { liteship } from '@liteship/vite';

const config = defineConfig({
  plugins: [liteship({ dirs: { theme: 'src/themes' }, hmr: true })],
});
```

## Interfaces

- [CollectBoundaryManifestOptions](interfaces/CollectBoundaryManifestOptions.md)
- [CollectThemeManifestOptions](interfaces/CollectThemeManifestOptions.md)
- [CollectTokenManifestOptions](interfaces/CollectTokenManifestOptions.md)
- [HMRPayload](interfaces/HMRPayload.md)
- [LoadedProjectConfig](interfaces/LoadedProjectConfig.md)
- [PluginConfig](interfaces/PluginConfig.md)
- [PrimitiveResolution](interfaces/PrimitiveResolution.md)
- [QuantizeAtRuleGroup](interfaces/QuantizeAtRuleGroup.md)
- [QuantizeBlock](interfaces/QuantizeBlock.md)
- [QuantizeNestedRule](interfaces/QuantizeNestedRule.md)
- [QuantizeSheetContext](interfaces/QuantizeSheetContext.md)
- [QuantizeStateBody](interfaces/QuantizeStateBody.md)
- [StyleBlock](interfaces/StyleBlock.md)
- [ThemeBlock](interfaces/ThemeBlock.md)
- [TokenBlock](interfaces/TokenBlock.md)
- [VirtualModuleData](interfaces/VirtualModuleData.md)
- [WASMResolution](interfaces/WASMResolution.md)

## Type Aliases

- [PrimitiveKind](type-aliases/PrimitiveKind.md)
- [PrimitiveShape](type-aliases/PrimitiveShape.md)
- [ProjectConfigLoader](type-aliases/ProjectConfigLoader.md)
- [ThemeManifest](type-aliases/ThemeManifest.md)
- [ThemeManifestEntry](type-aliases/ThemeManifestEntry.md)
- [TokenManifest](type-aliases/TokenManifest.md)
- [TokenManifestEntry](type-aliases/TokenManifestEntry.md)
- [VirtualModuleId](type-aliases/VirtualModuleId.md)

## Functions

- [collectBoundaryManifest](functions/collectBoundaryManifest.md)
- [collectThemeManifest](functions/collectThemeManifest.md)
- [collectTokenManifest](functions/collectTokenManifest.md)
- [compileCollectedTokensCss](functions/compileCollectedTokensCss.md)
- [compileQuantizeBlock](functions/compileQuantizeBlock.md)
- [compileStyleBlock](functions/compileStyleBlock.md)
- [compileThemeBlock](functions/compileThemeBlock.md)
- [compileTokenBlock](functions/compileTokenBlock.md)
- [handleHMR](functions/handleHMR.md)
- [isVirtualId](functions/isVirtualId.md)
- [loadProjectConfig](functions/loadProjectConfig.md)
- [loadVirtualModule](functions/loadVirtualModule.md)
- [parseQuantizeBlocks](functions/parseQuantizeBlocks.md)
- [parseStyleBlocks](functions/parseStyleBlocks.md)
- [parseThemeBlocks](functions/parseThemeBlocks.md)
- [parseTokenBlocks](functions/parseTokenBlocks.md)
- [plugin](functions/plugin.md)
- [primitiveSearchPatterns](functions/primitiveSearchPatterns.md)
- [resolvePrimitive](functions/resolvePrimitive.md)
- [resolveVirtualId](functions/resolveVirtualId.md)
- [resolveWASM](functions/resolveWASM.md)
- [serializeBoundaryOutput](functions/serializeBoundaryOutput.md)
- [transformHTML](functions/transformHTML.md)
- [viewportContainmentRule](functions/viewportContainmentRule.md)

## References

### liteship

Renames and re-exports [plugin](functions/plugin.md)
