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
// AI-apply seam (0.4.0 item D): cast the LIVE graph OUT to a model-facing AIContext,
// and admit a VALIDATED graph-patch proposal back IN — applying it through the
// token-witness validation chain (`AICast.validateGraphPatchProposal` →
// `applyValidatedPatch`) and re-casting only the delta via item B's seam. LiteShip
// exposes the seam; the producer that calls a model is downstream / out of scope.
export { castGraphContext, admitGraphPatchProposal } from './graph-ai-apply.js';
export type { AdmitPatchResult } from './graph-ai-apply.js';
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
