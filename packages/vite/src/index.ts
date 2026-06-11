/**
 * `@czap/vite` — **LiteShip** Vite 8 plugin: turns `@token` / `@theme` /
 * `@style` / `@quantize` at-rule blocks into native CSS and **rigs** HMR for
 * `@czap/*` definitions.
 *
 * The plugin hooks into Vite's `resolveId`, `load`, `transform`, and
 * `handleHotUpdate` phases:
 *
 * - `resolveId` + `load`: map `virtual:czap/*` specifiers to generated
 *   modules (device capabilities, WASM URL, ...).
 * - `transform`: rewrite `@token`, `@theme`, `@style`, and `@quantize`
 *   at-rule blocks into native CSS (custom properties,
 *   `html[data-theme]` selectors, scoped `@layer` / `@scope` rules,
 *   and `@container` queries).
 * - `handleHotUpdate`: emit surgical HMR payloads so CSS variables,
 *   shader uniforms, and boundary definitions update without a full
 *   page reload.
 *
 * Definitions are discovered by convention (`tokens.ts` / `*.tokens.ts`,
 * `themes.ts` / `*.themes.ts`, ... next to the referencing file, then at
 * the project root) — no listing required. Override the search directory
 * per primitive kind via {@link PluginConfig.dirs}.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from 'vite';
 * import { plugin as czap } from '@czap/vite';
 *
 * const config = defineConfig({
 *   plugins: [czap({ dirs: { theme: 'src/themes' }, hmr: true })],
 * });
 * ```
 *
 * @module
 */

// Plugin
export type { PluginConfig } from './plugin.js';
export { plugin } from './plugin.js';
export { resolveWASM } from './wasm-resolve.js';
export type { WASMResolution } from './wasm-resolve.js';

// @quantize
export type { QuantizeBlock, QuantizeStateBody, QuantizeNestedRule } from './css-quantize.js';
export { parseQuantizeBlocks, compileQuantizeBlock } from './css-quantize.js';

// @token
export type { TokenBlock } from './token-transform.js';
export { parseTokenBlocks, compileTokenBlock } from './token-transform.js';

// @theme
export type { ThemeBlock } from './theme-transform.js';
export { parseThemeBlocks, compileThemeBlock } from './theme-transform.js';

// @style
export type { StyleBlock } from './style-transform.js';
export { parseStyleBlocks, compileStyleBlock } from './style-transform.js';

// HTML transform
export { transformHTML } from './html-transform.js';

// Virtual modules
export type { VirtualModuleId } from './virtual-modules.js';
export { resolveVirtualId, isVirtualId, loadVirtualModule } from './virtual-modules.js';

// HMR
export type { HMRPayload } from './hmr.js';
export { handleHMR } from './hmr.js';

// Generic primitive resolution. `KIND_META` is intentionally not exported —
// it's the internal static lookup table that powers `resolvePrimitive`.
// Consumers building custom Vite plugin layers use `resolvePrimitive`
// (and `primitiveSearchPatterns` to mirror the plugin's "searched here"
// diagnostics); they don't need the internal config map.
export type { PrimitiveKind, PrimitiveResolution, PrimitiveShape } from './primitive-resolve.js';
export { resolvePrimitive, primitiveSearchPatterns } from './primitive-resolve.js';
