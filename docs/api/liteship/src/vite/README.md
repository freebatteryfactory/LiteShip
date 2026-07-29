[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / liteship/src/vite

# liteship/src/vite

`liteship/vite` — the curated facade over `@liteship/vite`: LiteShip's Vite 8
plugin. The `plugin` (aliased `liteship`) that rewrites `@token` / `@theme` /
`@style` / `@quantize` at-rule blocks into native CSS and rigs HMR for
`@liteship/*` definitions, plus the standalone block parsers/compilers, the
virtual-module resolvers, the boundary/token/theme manifest collectors, the HTML
transform, and the generic primitive resolver. Curated named re-exports only —
no behavior lives here.

Importing this subpath evaluates `@liteship/vite`, which carries a `vite` peer
expectation (declared OPTIONAL on `liteship`). The root `liteship` entry never
reaches this module — the subpath module graphs are independent.

## Interfaces

- [CollectBoundaryManifestOptions](interfaces/CollectBoundaryManifestOptions.md)
- [CollectThemeManifestOptions](interfaces/CollectThemeManifestOptions.md)
- [CollectTokenManifestOptions](interfaces/CollectTokenManifestOptions.md)
- [HMRPayload](interfaces/HMRPayload.md)
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

- [Primitive](type-aliases/Primitive.md)
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

***

### PrimitiveKind

Re-exports [PrimitiveKind](../../../vite/src/type-aliases/PrimitiveKind.md)
