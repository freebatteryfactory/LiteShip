/**
 * `@liteship/core/authoring` — the DECLARATION vocabulary: boundaries, tokens,
 * styles, themes, components, the config hub, the plan graph, the AI-cast
 * primitive, and the capsule assembly factory (incl. the concrete capsule
 * declarations). Curated named re-exports only — no behavior lives here.
 * @module
 */

export type {
  CapsuleCommandDescriptor,
  CapsuleCommandInvocation,
  CapsuleCommandResult,
  CapsuleResultReceipt,
  CapsuleResultMetaKey,
  CommandAnnotations,
  CommandExecutionKind,
  CommandJsonSchema,
  WallClockTimestamp,
} from './command.js';

export { Boundary, defineBoundary, BoundarySpec } from './boundary.js';

export { BoundaryAttribute } from './boundary-attribute.js';

export { Token, defineToken } from './token.js';

export type { TokenCategory } from './token.js';

export { Style, defineStyle } from './style.js';

export type { StyleLayer, ShadowLayer } from './style.js';

export { Theme, defineTheme } from './theme.js';

export { defineAdaptive, serializeBoundaryAttrValue, boundaryAttrIdentity } from './adaptive.js';

// Internal lowering seam (`_`-prefixed): `@liteship/quantizer` and
// `@liteship/compiler` inject their memoized constructors here on load so
// `defineAdaptive` lowers through the real (identity-preserving) primitives
// without core taking a build/init-cycling runtime edge on the layers above it.
export { _registerAdaptiveQuantizerLowering, _registerAdaptiveStyleLayerCompiler } from './adaptive.js';

export type { AdaptiveQuantizeOptions, AdaptiveQuantizerConfig, AdaptiveQuantizerLowering } from './adaptive.js';

export type { Adaptive, AdaptiveSpec, AdaptiveExplanation, AdaptivePlan, ConstraintTrace } from './adaptive.js';

export type { StateUnion, OutputsFor, EvaluateResult } from './types.js';

export { tupleMap } from './tuple-map.js';

export { createComponent } from './component.js';

export type { Component, SlotConfig } from './component.js';

export { Composable, ComposableWorld, createComposable } from './composable.js';

export type { EntityComponents, ComposableEntity, ComposableWorldShape } from './composable.js';

export { Plan } from './plan.js';

export type { OpType, EdgeType } from './plan.js';

export { AICast } from './ai-cast.js';

export type {
  AIContext,
  GraphSummary,
  ProposalSchema,
  CastContextOptions,
  ProposalResult,
  ProposalAcceptance,
  ProposalRejection,
  GeneratedUIValidator,
} from './ai-cast.js';

export {
  DEFAULT_TARGET_FPS,
  MS_PER_SEC,
  SSE_BUFFER_SIZE,
  SSE_HEARTBEAT_MS,
  SSE_RECONNECT_INITIAL_MS,
  SSE_RECONNECT_MAX_MS,
  COMPOSITOR_POOL_CAP,
  DIRTY_FLAGS_MAX,
  WASM_SCRATCH_BASE,
  WASM_BATCH_MAX,
  CAPTURE_KEYFRAME_INTERVAL,
  EASING_SPRING_STEPS,
  THEME_TRANSITION_DURATION_MS,
  THEME_TRANSITION_EASING,
  CANVAS_FALLBACK_WIDTH,
  CANVAS_FALLBACK_HEIGHT,
  VIEWPORT,
} from './defaults.js';

export { ShipCapsule } from './ship-capsule.js';

export { Config, defineConfig } from './config.js';

export type {
  PrimitiveKind,
  PluginConfig as CorePluginConfig,
  AstroConfig as CoreAstroConfig,
  ConfigInput,
} from './config.js';

export type {
  AssemblyKind,
  Site,
  CapabilityDecl,
  BudgetDecl,
  Invariant,
  AttributionDecl,
  CapsuleContract,
  Reason,
  Decision,
} from './capsule.js';

export { TypeValidator } from './capsule.js';

export { defineCapsule, getCapsuleCatalog } from './assembly.js';

export type { CapsuleDef } from './assembly.js';

export { boundaryEvaluateCapsule } from './capsules/boundary-evaluate.js';

export { tokenBufferCapsule } from './capsules/token-buffer.js';

export { canonicalCborCapsule } from './capsules/canonical-cbor.js';

export { canonicalCborDecodeCapsule } from './capsules/canonical-cbor-decode.js';

export { graphPatchIdentityCapsule } from './capsules/graph-patch-identity.js';

export { escalationChooseTierCapsule } from './capsules/escalation-choose-tier.js';

export { documentGraphAddressCapsule } from './capsules/document-graph-address.js';

export { aiCastSummarizeCapsule } from './capsules/ai-cast-summarize.js';

export { aiCastProposalCapsule } from './capsules/ai-cast-proposal.js';
