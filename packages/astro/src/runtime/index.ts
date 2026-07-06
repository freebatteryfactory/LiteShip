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
export { driveUniformFromSignal } from './uniform-signal.js';
// Programmatic LLM session (the documented catalog-wiring path in GETTING-STARTED):
// GETTING-STARTED and the scaffold README have taught this import since the genui
// wave, but the symbol was never re-exported here — the documented path did not
// resolve. Completion, not a new capability: the host builds a session over its own
// element/target with a host-owned genui catalog; the directive runtime composes the
// same factory internally (`runtime/llm.ts`).
export { createLLMSession } from './llm-session.js';
export type { LLMSessionConfig, LLMSessionShape } from './llm-session.js';
export { bootstrapSlots, getSlotRegistry, reinitializeDirectives, teardownDirectives, rescanSlots } from './slots.js';
export { bootstrapDirectives, scanAndBootDirectives } from './directive-boot.js';
export type { DirectiveName } from './directive-boot.js';
// The single ordered `astro:after-swap` pipeline (F-1): one listener runs
// [rescanSlots, bootDirectives, reinitDirectives] in a guaranteed order.
export { installSwapPipeline, runSwapPipeline, SWAP_STEPS } from './swap-pipeline.js';
export type { SwapStep } from './swap-pipeline.js';
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
export { castGraphContext, admitGraphPatchProposal, adoptAppliedGraph } from './graph-ai-apply.js';
export type { AdmitPatchResult } from './graph-ai-apply.js';
// Scene → live-runtime bridge (0.4.0 item C): drive the live graph runtime from a
// signal-indexed `@czap/scene`, splitting DISCRETE crossings (→ recast) from the
// CONTINUOUS tween (→ leaf CSS var / GPU uniform). Continuous motion never recasts.
export { bridgeSceneToGraph } from './scene-bridge.js';
export { writeContinuousMap } from './write-continuous-map.js';
export type {
  BridgeableScene,
  BridgeClock,
  BridgeOptions,
  SceneBridgeHandle,
  SceneWorld,
  SceneQueryEffect,
} from './scene-bridge.js';
// Scene-stage REFERENCE CONSUMER: the in-repo caller that drives a REAL compiled
// `@czap/scene` runtime through `bridgeSceneToGraph` onto a live graph (item C),
// and composes `castGraphContext` → `admitGraphPatchProposal` for the AI seam
// (item D). This is the real producer→consumer wiring the seams' exports stop at.
export { driveSceneStage, castStageContext, applyGraphSuggestion, sceneStageRunQuery } from './scene-stage.js';
export type { SceneStageOptions } from './scene-stage.js';
export { configureWasmRuntime, loadWasmRuntime, resolveWasmUrl } from './wasm.js';
export { allowRuntimeEndpointUrl, allowSameOriginRuntimeUrl, isSameOriginRuntimeUrl } from './url-policy.js';
export {
  configureRuntimePolicy,
  normalizeRuntimeSecurityPolicy,
  readRuntimeEndpointPolicy,
  readRuntimeHtmlPolicy,
  readRuntimePolicy,
  readRuntimePolicyWithSource,
} from './policy.js';
export type { RuntimeEndpointKind, RuntimeEndpointPolicy, HtmlPolicy } from '@czap/web';
export type {
  RuntimeHtmlPolicy,
  RuntimeSecurityPolicy,
  NormalizedRuntimeSecurityPolicy,
  RuntimePolicySource,
  RuntimePolicyReadout,
} from './policy.js';
// SVG last-mile: live DOM applicator around @czap/scene's pure svg-egress.
export { attachSvgRuntime, initSvgDirective, buildEntityElementResolver, parseSvgStateAttrs } from './svg.js';
export type { SvgStateAttrs, SvgEntityElementResolver } from './svg.js';
