/**
 * `@liteship/core/wasm` — the WASM dispatch surface: the kernel dispatcher, the
 * pure JS fallback kernels, and the f32-canonical boundary state-index kernel
 * (with its inlinable worker-blob source twin). Curated named re-exports only.
 * @module
 */

export { rawIndexF32, EVALUATE_THRESHOLDS_SOURCE } from './boundary-f32.js';

export { WASMDispatch } from './wasm-dispatch.js';

export type { WASMKernels, WASMDispatchAPI } from './wasm-dispatch.js';

export { fallbackKernels } from './wasm-fallback.js';
