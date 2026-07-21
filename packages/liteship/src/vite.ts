/**
 * `liteship/vite` — the curated facade over `@liteship/vite`: LiteShip's Vite 8
 * plugin. The `plugin` (aliased `liteship`) that rewrites `@token` / `@theme` /
 * `@style` / `@quantize` at-rule blocks into native CSS and rigs HMR for
 * `@liteship/*` definitions, plus the standalone block parsers/compilers, the
 * virtual-module resolvers, the boundary/token/theme manifest collectors, the HTML
 * transform, and the generic primitive resolver. Curated named re-exports only —
 * no behavior lives here.
 *
 * Importing this subpath evaluates `@liteship/vite`, which carries a `vite` peer
 * expectation (declared OPTIONAL on `liteship`). The root `liteship` entry never
 * reaches this module — the subpath module graphs are independent.
 * @module
 */

export type { PluginConfig } from '@liteship/vite';
export { plugin } from '@liteship/vite';
export { plugin as liteship } from '@liteship/vite';
export { resolveWASM } from '@liteship/vite';
export type { WASMResolution } from '@liteship/vite';

export type {
  QuantizeBlock,
  QuantizeStateBody,
  QuantizeNestedRule,
  QuantizeAtRuleGroup,
  QuantizeSheetContext,
} from '@liteship/vite';
export { parseQuantizeBlocks, compileQuantizeBlock, viewportContainmentRule } from '@liteship/vite';

export type { TokenBlock } from '@liteship/vite';
export { parseTokenBlocks, compileTokenBlock } from '@liteship/vite';

export type { ThemeBlock } from '@liteship/vite';
export { parseThemeBlocks, compileThemeBlock } from '@liteship/vite';

export type { StyleBlock } from '@liteship/vite';
export { parseStyleBlocks, compileStyleBlock } from '@liteship/vite';

export { transformHTML } from '@liteship/vite';

export type { VirtualModuleId, VirtualModuleData } from '@liteship/vite';
export { resolveVirtualId, isVirtualId, loadVirtualModule } from '@liteship/vite';

export type { CollectBoundaryManifestOptions } from '@liteship/vite';
export { collectBoundaryManifest, serializeBoundaryOutput } from '@liteship/vite';

export type {
  CollectTokenManifestOptions,
  CollectThemeManifestOptions,
  TokenManifest,
  TokenManifestEntry,
  ThemeManifest,
  ThemeManifestEntry,
} from '@liteship/vite';
export { collectTokenManifest, collectThemeManifest, compileCollectedTokensCss } from '@liteship/vite';

export type { HMRPayload } from '@liteship/vite';
export { handleHMR } from '@liteship/vite';

export type { PrimitiveKind, PrimitiveResolution, PrimitiveShape } from '@liteship/vite';
export { resolvePrimitive, primitiveSearchPatterns } from '@liteship/vite';
