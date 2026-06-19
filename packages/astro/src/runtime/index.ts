export {
  attachSignalObserver,
  readSignalValue,
  parseBoundary,
  evaluateBoundary,
  applyBoundaryState,
} from './boundary.js';
// Live audio producer: wire an AnalyserNode and the audio.* boundary family
// lights up through the existing source-agnostic carve-path.
export { driveAudioFromAnalyser, readAudioSignal, attachAudioObserver } from './audio-signal.js';
export { bootstrapSlots, getSlotRegistry, installSwapReinit, reinitializeDirectives, rescanSlots } from './slots.js';
export { bootstrapDirectives, scanAndBootDirectives } from './directive-boot.js';
export type { DirectiveName } from './directive-boot.js';
// DocumentGraph runtime loader (0.4.0 item B): lower a serialized graph onto the
// live cast pipeline + the delta re-cast seam (`castGraphDelta`, reused by the AI
// seam). `lowerGraph` is the pure, SSR-safe graph→bindings projection.
export { loadGraphRuntime, castGraphDelta, createCastState, releaseCastState } from './graph-runtime.js';
export type { GraphRuntimeHandle, EntityElementResolver, GraphCastState } from './graph-runtime.js';
export { lowerGraph } from './graph-lower.js';
export type { LoweredBinding, LoweredTarget } from './graph-lower.js';
export { configureWasmRuntime, loadWasmRuntime, resolveWasmUrl } from './wasm.js';
export { allowRuntimeEndpointUrl, allowSameOriginRuntimeUrl, isSameOriginRuntimeUrl } from './url-policy.js';
export {
  configureRuntimePolicy,
  normalizeRuntimeSecurityPolicy,
  readRuntimeEndpointPolicy,
  readRuntimeHtmlPolicy,
  readRuntimePolicy,
} from './policy.js';
export type { RuntimeEndpointKind, RuntimeEndpointPolicy, HtmlPolicy } from '@czap/web';
export type { RuntimeHtmlPolicy, RuntimeSecurityPolicy, NormalizedRuntimeSecurityPolicy } from './policy.js';
