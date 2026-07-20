/**
 * `@liteship/core` — **LiteShip** primitives: boundaries,
 * tokens, styles, themes, signals, and working-deck coordination (compositor,
 * plan graph, ECS, capsule factory).
 * @module
 */

// Brands — sanctioned constructors. The lower-level `brand` factory is
// intentionally NOT re-exported here; it is the unsafe escape-hatch used
// by `schema/brands.ts` itself to define the sanctioned set, and exposing it on
// the public surface would let consumers forge any brand. The factory is not
// exported on any subpath — code that genuinely needs to mint a new brand adds
// it to `schema/brands.ts` directly and documents the use site.
export {
  SignalInput,
  ThresholdValue,
  StateName,
  ContentAddress,
  IntegrityDigest,
  TokenRef,
  Millis,
} from './schema/index.js';
export type { HLCBrand } from './schema/index.js';

// Command language (CUT A1) — declaration-only contract re-anchored from
// @liteship/_spine; the registry/dispatcher runtime lives in @liteship/command.
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
} from './authoring/index.js';

// FNV-1a hash utility
export { fnv1a, fnv1aBytes } from './internal/fnv.js';

// Canonical CBOR encoder (RFC 8949 §4.2.1) — content-address kernel
export { CanonicalCbor } from './schema/index.js';

// ── Schema kernel — the transport-agnostic (effect-free) schema substrate ─────
// The single JSON-Schema deriver (successor to the deleted Effect-AST deriver):
// `schema.*` constructors over a frozen plain-data AST, type-level `Infer`, strict/
// lenient `decode` with the tagged `DecodeIssue` algebra, the `toJsonSchema`
// deriver, and the `~standard` bridge. The full surface (`schema`, `toJsonSchema`,
// `Infer`, the `DecodeIssue` algebra, `JsonSchemaObject`/`JsonSchemaFragment`,
// the `~standard` bridge) ships HERE on the main `@liteship/core` barrel.
export {
  schema,
  withArbitrary,
  isSchema,
  decode,
  decodeLenient,
  parseErrorFromIssues,
  toJsonSchema,
} from './schema/index.js';
export { toStandardSchema, standardResultOf } from './schema/index.js';
export type { KernelDecodeResult, DecodeIssueView } from './schema/index.js';
export type {
  Schema,
  SchemaNode,
  Infer,
  InferEncoded,
  StructType,
  StructEncoded,
  DecodeIssue,
  DecodeIssueCode,
  DecodePath,
  DecodeResult,
  LiteshipStandardSchema,
  JsonSchemaObject,
  JsonSchemaFragment,
} from './schema/index.js';

// SchemaPort — the permanent, effect-free structural schema contract (ADR-0010,
// spine-first): the phantom `Type`/`Encoded` pair every schema value carries, so
// a `CapsuleContract`/`Codec`/`Part` slot names THIS instead of `effect`'s Schema.
export { asDeclaration } from './schema/index.js';
export type { SchemaPort, DeclarationSchema } from './schema/index.js';

// ── Lifetime + CellKernel — the disposal + reactive substrate primitives ──────
// `Lifetime` is the LIFO, exactly-once, idempotent disposal handle that replaces
// Scope/ManagedRuntime at seams; `CellKernel` is the replay-current / no-replay
// fan-out kernel extracted from the compositor's listener-Set. The reactive
// primitives (Cell/Derived/Store/Signal/Zap) rebuild on these in later waves.
export { Lifetime } from './reactive/index.js';
export type { LifetimeShape, LifetimeDisposeError, Finalizer } from './reactive/index.js';
export { CellKernel } from './reactive/index.js';
export type { Disposer, CellSink, CellSubscriber, CellReplayShape, CellFanoutShape } from './reactive/index.js';

// Type utilities
export type {
  Prettify,
  StateUnion,
  OutputsFor,
  BoundaryCrossing,
  EvaluateResult,
  RequireAtLeastOne,
  DeepReadonly,
} from './internal/type-level.js';

// Tuple utilities
export { tupleMap } from './internal/tuple.js';

// ── Shared leaf utilities — the browser-safe [DUP] owners ────────────────────
// The single home for primitives the repo had inlined in many copies: the
// unit-interval clamp, the Levenshtein table + nearest-match picker (threshold
// caller-supplied, so one table subsumes the assets/scene/command policies), and
// the backslash→slash repo-path normalizer (audit's B5b one-normalizer cage). The
// Node-only `walkFiles` sibling stays OUT of this index — it rides `@liteship/core/fs-walk`.
export { clamp01 } from './internal/numeric.js';
export { editDistance, closestMatch } from './internal/string-distance.js';
export { normalizeRepoPath } from './internal/path-normalize.js';

// Boundary. `BoundarySpec` is exported as a value+type pair (see the
// namespace-object pattern in ADR-0001); consumers who want only the type
// can `import type { BoundarySpec } from '@liteship/core'`.
export { Boundary, defineBoundary, BoundarySpec } from './authoring/index.js';

// The determinism substrate: the one injectable shape time + randomness are read
// through, so the ONLY ambient wall-clock / Math.random read in the runtime lives
// in `systemClock` / `systemRng` (the single declared entropy boundary). Every
// other runtime path threads an injected clock/rng defaulting to the system one.
export { type Clock, type ManualClock, systemClock, wallClock, fixedClock, manualClock } from './clock/index.js';
export { type Rng, systemRng, seededRng } from './internal/rng.js';

// The single f32-canonical state-index kernel and its worker-blob twin string.
// `rawIndexF32` is THE numeric semantics for boundary evaluation; the host
// startup path (@liteship/worker) delegates to it, and `EVALUATE_THRESHOLDS_SOURCE`
// is the inlinable mirror the worker/render blob scripts embed.
export { rawIndexF32, EVALUATE_THRESHOLDS_SOURCE } from './wasm/index.js';
// Projection vocabulary — the single home of per-quantizer output key naming
// (CSS custom property / GLSL uniform / WGSL struct field / ARIA attribute).
// `glslIdent` is shared with @liteship/compiler's GLSL arm and `wgslIdent` with its
// WGSL arm; `PROJECTION_KEYS_SOURCE` is the worker twin.
export { projectionKeys, glslIdent, wgslIdent, PROJECTION_KEYS_SOURCE } from './graph/index.js';
export type { ProjectionKeys } from './graph/index.js';
// Shared boundary/runtime attribute-projection predicate (CUT A4) — consumed by
// @liteship/compiler (ARIA compilation) and @liteship/astro (runtime boundary attrs).
export { BoundaryAttribute } from './authoring/index.js';

// Token
export { Token, defineToken } from './authoring/index.js';
export type { TokenCategory } from './authoring/index.js';

// Style
export { Style, defineStyle } from './authoring/index.js';
export type { StyleLayer, ShadowLayer } from './authoring/index.js';

// Theme
export { Theme, defineTheme } from './authoring/index.js';

// Component
export { Component } from './authoring/index.js';
export type { SlotConfig } from './authoring/index.js';

// Signal
export { Signal } from './reactive/index.js';
export type { SignalSourceType, SignalSource } from './reactive/index.js';
// The sanctioned SignalSource <-> SignalInput bridge (source of truth for the
// input vocabulary; replaces every hand-rolled `input.startsWith(...)` fork).
export { sourceToInput, inputToSource, inputSourceType } from './reactive/index.js';

// Easing
export { Easing, sampleRuntimeEasing, DEFAULT_MOTION_SPRING } from './motion/index.js';
export type { RuntimeEasing } from './motion/index.js';

// Animation
export { Animation } from './motion/index.js';

// Typed interpolation + TransitionNode interpreter (#130 children 1–2)
export { interpolate, interpolateTyped, parseTypedBinding, formatTypedValue } from './motion/index.js';
export type { TypedValue, TransformPart, ColorSpace } from './motion/index.js';
export { interpretTransition } from './motion/index.js';
export type {
  LoweredMotionPlan,
  CssMotionPlan,
  NativeTimelineEligibility,
  RuntimeWritePlan,
  RuntimeWriteProperty,
  RuntimeWriteWindow,
  MotionPropertyTween,
  CssKeyframeStep,
} from './motion/index.js';

// TransitionProgram — the explicit multi-transition algebra (#141). Composes
// TransitionNodes (seq/par/choice) into a real timeline + multi-offset keyframes +
// per-window runtime sub-samplers, replacing the deleted routing-label collapse.
export {
  lowerTransitionProgram,
  interpretProgram,
  sampleProgramWindows,
  sampleProgram,
  sampleProgramUniforms,
  frameToT,
} from './motion/index.js';
export type {
  TransitionProgram,
  TransitionBranch,
  BranchCondition,
  ProgramEnv,
  BranchGuard,
  ProgramTimelineEntry,
  LoweredProgramTimeline,
  ProgramSample,
  ProgramUniforms,
} from './motion/index.js';

// Reveal intent sugar + graph lowering (#124). `lowerRevealChain` (#141) authors a
// multi-step chain (seq + optional choice) into one graph + a TransitionProgram.
export {
  Reveal,
  lowerRevealIntent,
  lowerRevealChain,
  resolveRevealInitialState,
  ssrRevealPaint,
  motionPropToBinding,
} from './motion/index.js';
export type {
  RevealIntent,
  RevealIntentInput,
  RevealTrigger,
  RevealTransition,
  RevealPolicy,
  RevealReducedMotion,
  LoweredReveal,
  RevealSsrPaint,
  RevealChainInput,
  RevealChainStep,
  RevealChainBranch,
  LoweredRevealChain,
} from './motion/index.js';

// Stagger intent sugar + graph lowering (#124 stagger). `staggerProgram` (#141)
// composes the lowered children into a `par` TransitionProgram.
export { Stagger, lowerStaggerIntent, resolveStaggerInitialState, staggerProgram } from './motion/index.js';
export type {
  StaggerIntent,
  StaggerIntentInput,
  StaggerChild,
  LoweredStagger,
  LoweredStaggerItem,
} from './motion/index.js';

// Scroll-timeline intent sugar + graph lowering (#126)
export { ScrollTimeline, lowerScrollTimelineIntent, resolveScrollTimelineInitialState } from './motion/index.js';
export type {
  ScrollTimelineIntent,
  ScrollTimelineIntentInput,
  ScrollTimelineAxis,
  LoweredScrollTimeline,
} from './motion/index.js';

// Responsive-media intent + projection (#125) — the effective-candidate law (#140)
export {
  ResponsiveMedia,
  selectCandidates,
  resolveResponsiveMedia,
  buildResponsiveSrcset,
  buildResponsiveImageSet,
  projectResponsiveMediaPicture,
} from './media/index.js';
export type {
  ResponsiveMediaIntent,
  ResponsiveMediaIntentInput,
  ResponsiveMediaVariant,
  ResponsiveMediaCapabilities,
  ResponsiveMediaResolutionReason,
  ResolvedResponsiveMedia,
  ResponsiveMediaCandidateSet,
  ResponsiveMediaPictureProjection,
} from './media/index.js';

// StateCell / ProjectionState — typed authority over coarse runtime state (#130 child 5)
export { StateCell, ProjectionState, StateCellStore } from './reactive/index.js';
export type {
  StateAuthority,
  StateCellKind,
  StateCell as StateCellShape,
  StateResolutionReceipt,
  ProjectionState as ProjectionStateShape,
  ResolvedStateSnapshot,
  StateCellRegisterOptions,
  ProjectionStateOptions,
  StateCellStoreShape,
} from './reactive/index.js';

// Stream recovery — discrete/continuous replay discriminator (#133)
export {
  asReplayableRecoveryCell,
  signalSourceKind,
  signalPayloadKind,
  isReplayHtmlPatch,
  replayDroppedSignals,
  filterDiscreteSnapshotSignals,
  validateSnapshotSignalsField,
} from './reactive/index.js';
export type { ReplayableRecoveryCell } from './reactive/index.js';

// Timeline
export { createTimeline } from './motion/index.js';
export type { Timeline } from './motion/index.js';

// Quantizer types
export type {
  Quantizer,
  ReactiveQuantizer,
  CompositorQuantizer,
  QuantizerState,
  QuantizerCrossings,
} from './schema/index.js';

// Scheduler
export { Scheduler, rafDebounce, startRafLoop } from './reactive/index.js';
export type { RafDebouncedTrigger } from './reactive/index.js';

// Compositor
export { Compositor } from './media/index.js';
export type { CompositeState, CompositorConfig } from './media/index.js';

// Compositor State Pool
export { CompositorStatePool } from './media/index.js';

// Speculative Evaluation
export { SpeculativeEvaluator } from './reactive/index.js';

// Token Buffer
export { TokenBuffer } from './media/index.js';

// UI Quality
export { UIQuality } from './evidence/index.js';
export type { UIQualityTier, MotionTier } from './evidence/index.js';

// Generative UI Frames
export { GenFrame } from './media/index.js';
export type { UIFrame, FrameType, MorphStrategy, GapStrategy } from './media/index.js';

// Video
export { VideoRenderer, compositeStateToRgba } from './media/index.js';
export type { VideoConfig, VideoFrameOutput } from './media/index.js';

// Capture
export type { CaptureConfig, CaptureFrame, FrameCapture, CaptureResult } from './evidence/index.js';

// Blend
export { BlendTree } from './motion/index.js';

// Frame budget
export { FrameBudget } from './media/index.js';
export type { Priority } from './media/index.js';

// Dirty tracking
export { DirtyFlags } from './reactive/index.js';

// Protocol
export type { CellKind, CellMeta, CellEnvelope } from './schema/index.js';

// ECS
export type { Entity, System, DenseSystem, DenseStore } from './ecs.js';
export { Part, World, EntityId } from './ecs.js';

// Composable
export { Composable, ComposableWorld } from './authoring/index.js';
export type { EntityComponents, ComposableEntity, ComposableWorldShape } from './authoring/index.js';

// Cell
export { createCell } from './reactive/index.js';
export type { Cell } from './reactive/index.js';

// Derived
export { Derived, computed } from './reactive/index.js';

// Zap
export { Zap } from './reactive/index.js';

// Store
export { createStore } from './reactive/index.js';
export type { Store } from './reactive/index.js';

// Cap
export type { CapTier, CapSet } from './evidence/index.js';
export { Cap } from './evidence/index.js';

// Capability-admissibility quality-tier scale — the SINGLE index-keyed source both
// the core escalation chooser's `TIER_TARGET_SETS` (CapTier-keyed) and the quantizer's
// `TIER_TARGETS` (MotionTier-keyed) project from, so the two cannot drift.
export { QUALITY_TIER_TARGETS, QUALITY_TIER_COUNT, projectQualityTiers } from './evidence/index.js';
export type { QualityTierTarget } from './evidence/index.js';

// Escalation chooser (P5c) — the READER of PolicyNode (P2). Picks the minimal
// CapTier quality tier a policy admits on a runtime site, gated by site/budgets/grants
// and the CapTier↔target admissibility table projected from the shared
// `quality-tiers.ts` scale (no quantizer import — that would close a
// core→quantizer cycle; both project the same scale instead).
export { chooseTier } from './evidence/index.js';
export type { TierChoice, EscalationResult } from './evidence/index.js';

// HLC
export { HLC } from './clock/index.js';

// VectorClock
export { VectorClock } from './clock/index.js';

// TypedRef
export { TypedRef } from './internal/typed-ref.js';

// Receipt
export type {
  ReceiptSubject,
  ReceiptEnvelope,
  ChainValidationError,
  ChainValidationOptions,
} from './evidence/index.js';
export { Receipt } from './evidence/index.js';

// DAG
export type { DAGNode, ReceiptDAG, MergeResult, ForkViolation, CheckpointResult } from './graph/index.js';
export { DAG } from './graph/index.js';

// Plan
export { Plan } from './authoring/index.js';
export type { OpType, EdgeType } from './authoring/index.js';

// DocumentGraph — the keystone IR (P2). Type (document-graph.ts) + namespace-object
// value (document-graph-address.ts) merge into one `DocumentGraph` symbol, the
// ADR-0001 pattern. The addressing kernel is the one mint site for node + graph ids.
export type {
  DocumentGraph,
  DocumentGraphNode,
  DocumentGraphEdge,
  NodeFamily,
  RuntimeSite,
  SignalNode,
  EntityNode,
  ComponentNode,
  PoseNode,
  TransitionNode,
  ProjectionNode,
  PolicyNode,
  ExportNode,
} from './graph/index.js';
// The DocumentGraph kernel — seal (mint ids), validate, and linearize (reused
// from the Plan kernel). `addressNode`/`addressDocumentGraph` stay module-local
// (sealNode/sealGraph wrap them; in-core consumers import them by relative path).
// `decodeDocumentGraph` is the VERSION-AWARE, FAIL-CLOSED reader for an untrusted
// graph value (persisted JSON / wire payload): it gates `_tag`/`_version` + per-node
// well-formedness, rejecting a future-version or malformed graph with ONE tagged
// ParseError instead of silently misparsing it into a v1 shape.
export {
  sealNode,
  sealGraph,
  nodeFromParts,
  validateGraph,
  linearizeGraph,
  decodeDocumentGraph,
} from './graph/index.js';
export type { DocumentGraphNodeParts } from './graph/index.js';
// The one node well-formedness trust gate, shared by the AI proposal validator
// (ai-cast.ts) and the runtime graph loader (@liteship/astro) — untrusted JSON, one
// schema. Factored out of ai-cast.ts so neither seam owns a drifting copy.
export { isWellFormedNode, DocumentGraphNodeSchema } from './graph/index.js';
// The one content-addressing kernel (canonicalize → CanonicalCbor → fnv1a),
// shared by EntityId, DocumentGraph ids, and downstream GraphPatch re-addressing.
export { contentAddressOf, canonicalAddressBytes } from './evidence/index.js';

// ── GraphPatch — typed graph mutation + structural differ (P5b) ─────────────
// Tagged-delta over DocumentGraph: propose/apply (re-address via sealGraph) /
// preview / validate / diff (round-trips) / receipt / forkOf. The interface +
// namespace-object value merge into one `GraphPatch` symbol (ADR-0001), exactly
// like `Plan`. Kept in a small block so a 3-way merge with sibling phases editing
// this region is trivial.
export { GraphPatch, nodeLogicalKey } from './graph/index.js';
export type { PatchOp, NodePatchOp, EdgePatchOp } from './graph/index.js';
// ── end GraphPatch (P5b) ────────────────────────────────────────────────────

// ── AI cast — the framework PRIMITIVE: graph→context/schema→validated proposal ─
// "LiteShip teaches graphs how to speak to models; products decide whether model
// suggestions become action." `AICast.castContext` casts a DocumentGraph OUT to a
// content-addressed, token-budgeted model-facing context (advertising the
// GraphPatch schema as the model's output contract); the validators cast IN,
// minting a `ValidatedProposal` (the security envelope) that the host-authorized
// `applyValidatedPatch` is the ONLY consumer of. NO auto-apply, NO network.
export { AICast } from './authoring/index.js';
export type {
  AIContext,
  GraphSummary,
  ProposalSchema,
  CastContextOptions,
  ProposalResult,
  ProposalAcceptance,
  ProposalRejection,
  GeneratedUIValidator,
} from './authoring/index.js';
// The shared validated-model-output envelope (one discipline for GraphPatch AND
// genui GeneratedUITree proposals). `ValidatedProposal`/`ApplyToken` are exported
// as CONSUMER types only — `mintValidated` (the sole token mint site) is NOT
// re-exported, so the envelope stays un-forgeable outside the validators.
export type { ValidatedProposal, ApplyToken, ProposalTarget } from './evidence/index.js';
// `assertTokenBinds` re-derives the token binding (the host-side swap guard);
// `unwrapValidated` is the generated-UI apply SEAM (open question #1) — the same
// binding guard named for the host's intent: it hands back the validated payload
// for the host's OWN renderer/applier (core stays renderer-free, never invokes
// apply). `proposalSubject` exposes the citable content-address; `proposalReceiptSubject`
// derives the `ReceiptSubject` a host seeds its receipt DAG with (open question #7
// — a real sync seam onto the existing receipt machinery, not the async envelope).
export { assertTokenBinds, unwrapValidated, proposalSubject, proposalReceiptSubject } from './evidence/index.js';
// ── end AI cast ─────────────────────────────────────────────────────────────

// ── Client→server mutation channel — the return leg (SSE's mirror) ───────────
// The AI-cast refuse-seam turned into a transport-agnostic request/response so a
// client can propose a GraphPatch back to the server, which validates against its
// own truth before applying. `handleGraphMutation` is the host-wired server core;
// `sendGraphMutation` is the client sender. Host owns the GraphStore (authority).
export { handleGraphMutation, sendGraphMutation, verifyAppliedGraph } from './graph/index.js';
export type {
  GraphMutationRequest,
  GraphMutationResponse,
  GraphStore,
  AppliedGraphVerification,
} from './graph/index.js';
export { createGraphMutationClient } from './graph/index.js';
export type { GraphMutationClient, GraphMutationClientOptions, GraphMutationOps } from './graph/index.js';
// HTTP QUERY read-leg (#119) — transport-agnostic graph read + conditional etag.
export {
  handleGraphQuery,
  sendGraphQuery,
  graphQueryEtag,
  normalizeGraphQueryEtag,
  parseGraphQueryEtagList,
  createGraphQueryRefreshBase,
  GRAPH_QUERY_FALLBACK_HEADER,
} from './graph/index.js';
export type {
  GraphQueryRequest,
  GraphQueryResponse,
  GraphQueryEtagCandidates,
  SendGraphQueryOptions,
} from './graph/index.js';
// #133-full — graph-native gap replay over StateCell + DiscreteStateTransition
// receipt chain. `discreteSignalPayloadsFromPatch` is DELETED — it derived a
// runtime state VALUE from a SignalNode content-address (a category error). The
// value now arrives typed in the transition receipt payload (state-transition.ts).
export { chainPatchesBetween, replayDiscreteFromPatchReceipts, runGraphNativeGapReplay } from './graph/index.js';
export type {
  PatchReceiptEntry,
  ReplayDiscreteFromPatchReceiptsOptions,
  GraphNativeGapReplayOptions,
  GraphNativeGapReplayResult,
} from './graph/index.js';
// DiscreteStateTransition (#133 correctness) — the typed, attestation-checked
// authority record for a discrete crossing. The ONE hash law (Receipt/TypedRef);
// the subject law (`${base}#${cell}`) binds a receipt to one cell + graph. The
// replay INPUT type — `kind: 'discrete'` by construction makes a continuous
// value uncompilable into the replay path (Law 16).
export {
  transitionReceipt,
  mintTransition,
  decodeDiscreteStateTransition,
  applyTransition,
  discreteTransitionSubjectId,
  discreteTransitionPayload,
} from './motion/index.js';
export type { DiscreteStateTransition } from './motion/index.js';

// Runtime coordination
export { RuntimeCoordinator } from './reactive/index.js';
export type { RuntimePhase, RuntimeCoordinatorConfig } from './reactive/index.js';

// Codec
export { Codec } from './schema/index.js';
// `SchemaError` / `isSchemaError` removed from the main entry — they were
// orphan re-exports from `effect/Schema` with no consumers in the repo
// and added implicit coupling to an Effect internal sub-path. Consumers
// who need them should import directly from `effect/Schema`.

// LiveCell
export { LiveCell } from './reactive/index.js';

// WASM Dispatch
export { WASMDispatch } from './wasm/index.js';
export type { WASMKernels, WASMDispatchAPI } from './wasm/index.js';
export { fallbackKernels } from './wasm/index.js';

// AVBridge
export { AVBridge } from './media/index.js';

// AVRenderer
export { AVRenderer } from './media/index.js';

// Defaults (centralized constants)
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
} from './authoring/index.js';

// Diagnostics
export { Diagnostics } from './evidence/index.js';
export type { DiagnosticEvent, DiagnosticLevel, DiagnosticPayload, DiagnosticsSink } from './evidence/index.js';

// AddressedDigest + ShipCapsule (ADR-0011)
// Browser-bundleable: pure type + crypto.subtle hashing. The Node-only
// release-input manifest helpers (gzip/tar/yaml) live in @liteship/cli.
export { AddressedDigest } from './evidence/index.js';
export { ShipCapsule } from './authoring/index.js';

// Type guards
export { isCell, isDerived, isZap } from './reactive/index.js';
export type { Primitive } from './reactive/index.js';

// Config hub
export { Config, defineConfig } from './authoring/index.js';
export type { PrimitiveKind, CorePluginConfig, CoreAstroConfig, ConfigInput } from './authoring/index.js';

// Capsule factory base types
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
} from './authoring/index.js';

export { TypeValidator } from './authoring/index.js';

export { defineCapsule, getCapsuleCatalog } from './authoring/index.js';
export type { CapsuleDef } from './authoring/index.js';
// `resetCapsuleCatalog` is intentionally NOT re-exported here — it mutates
// global registry state and ships from `@liteship/core/testing` only.

// Capsule declarations — concrete instances of the 7-arm factory
export { boundaryEvaluateCapsule } from './authoring/index.js';
export { tokenBufferCapsule } from './authoring/index.js';
export { canonicalCborCapsule } from './authoring/index.js';
// The strict decoder capsule (P5a) — the encoder's round-trip peer. Exported
// here so it registers in the live `getCapsuleCatalog()` alongside the encoder
// (the reader the encoder's content-addressed bytes have lacked).
export { canonicalCborDecodeCapsule } from './authoring/index.js';
// The GraphPatch round-trip identity capsule (F) — locks `apply(a, diff(a, b))`
// deep-equals `b` as a standing pureTransform contract. Exported here so it
// registers in the live `getCapsuleCatalog()` (the contract the future graph
// editor builds against).
export { graphPatchIdentityCapsule } from './authoring/index.js';
// The escalation chooser capsule — locks `chooseTier`'s minimal-downgrade law
// (never escalates above `requires`), the site gate, determinism, and the
// fresh-Set memoization scar as a standing pureTransform contract. Exported here
// so it registers in the live `getCapsuleCatalog()`.
export { escalationChooseTierCapsule } from './authoring/index.js';
// The DocumentGraph addressing capsule — locks `addressDocumentGraph`'s
// determinism, fnv1a format, and order-independence (the CUT B1 code-unit
// regression guard) as a standing pureTransform contract. Exported here so it
// registers in the live `getCapsuleCatalog()`.
export { documentGraphAddressCapsule } from './authoring/index.js';
// The AI cast summarizer capsule — locks `summarizeGraph`'s determinism, budget
// honesty (estimatedTokens ≤ budget), budget monotonicity (a smaller budget never
// yields a larger summary), and node-count honesty as a standing pureTransform
// contract. Exported here so it registers in the live `getCapsuleCatalog()`.
export { aiCastSummarizeCapsule } from './authoring/index.js';
// The AI cast proposal-envelope capsule — locks the LOAD-BEARING security laws:
// no-bypass (a tampered proposal is refused at apply), apply-accepts-only-minted-
// token, validated-proposal determinism (stable subject + result id), valid-applies-
// and-re-addresses, and rejection-never-mints — as a standing pureTransform contract.
// Exported here so it registers in the live `getCapsuleCatalog()`.
export { aiCastProposalCapsule } from './authoring/index.js';

// Harness lives at `@liteship/core/harness` — per-arm test + bench template
// generators. Not re-exported here so consumers don't pull fast-check and
// the code-gen surface into every bundle.
