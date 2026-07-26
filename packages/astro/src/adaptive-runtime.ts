/**
 * Node-free adaptive projection helpers shared by Astro renderers and other
 * deterministic build hosts. This subpath deliberately excludes the Astro
 * integration, filesystem-backed docs routes, and every other host bootstrap.
 *
 * @module
 */

export { adaptiveAttrs, resolveInitialStateFallback } from './Adaptive.js';
export type { AdaptiveProps } from './Adaptive.js';
export { resolveInitialState, resolveInitialStateWithReceipt } from './quantize.js';
export type { ServerIslandContext, QuantizeProps, ResolvedInitialState } from './quantize.js';
