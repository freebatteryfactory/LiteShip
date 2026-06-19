/**
 * `@czap/core` — **LiteShip** primitives for the **CZAP** engine: boundaries,
 * tokens, styles, themes, signals, and working-deck coordination (compositor,
 * plan graph, ECS, capsule factory).
 * @module
 */

// Brands — sanctioned constructors. The lower-level `brand` factory is
// intentionally NOT re-exported here; it is the unsafe escape-hatch used
// by `brands.ts` itself to define the sanctioned set, and exposing it on
// the public surface would let consumers forge any brand. Code that
// genuinely needs to mint a new brand should import from `@czap/core/brands`
// directly and document the use site.
export { SignalInput, ThresholdValue, StateName, ContentAddress, IntegrityDigest, TokenRef, Millis } from './brands.js';
export type { HLC as HLCBrand } from './brands.js';

// Command language (CUT A1) — declaration-only contract re-anchored from
// @czap/_spine; the registry/dispatcher runtime lives in @czap/command.
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

// FNV-1a hash utility
export { fnv1a, fnv1aBytes } from './fnv.js';

// Canonical CBOR encoder (RFC 8949 §4.2.1) — content-address kernel
export { CanonicalCbor } from './cbor.js';

// Type utilities
export type {
  Prettify,
  StateUnion,
  OutputsFor,
  BoundaryCrossing,
  EvaluateResult,
  EffectValue,
  EffectError,
  RequireAtLeastOne,
  DeepReadonly,
} from './type-utils.js';

// Tuple utilities
export { tupleMap } from './tuple.js';

// Boundary. `BoundarySpec` is exported as a value+type pair (see the
// namespace-object pattern in ADR-0001); consumers who want only the type
// can `import type { BoundarySpec } from '@czap/core'`.
export { Boundary, BoundarySpec } from './boundary.js';
// The single f32-canonical state-index kernel and its worker-blob twin string.
// `rawIndexF32` is THE numeric semantics for boundary evaluation; the host
// startup path (@czap/worker) delegates to it, and `EVALUATE_THRESHOLDS_SOURCE`
// is the inlinable mirror the worker/render blob scripts embed.
export { rawIndexF32, EVALUATE_THRESHOLDS_SOURCE } from './boundary-f32.js';
// Projection vocabulary — the single home of per-quantizer output key naming
// (CSS custom property / GLSL uniform / WGSL struct field / ARIA attribute).
// `glslIdent` is shared with @czap/compiler's GLSL arm and `wgslIdent` with its
// WGSL arm; `PROJECTION_KEYS_SOURCE` is the worker twin.
export { projectionKeys, glslIdent, wgslIdent, PROJECTION_KEYS_SOURCE } from './projection.js';
export type { ProjectionKeys } from './projection.js';
// Shared boundary/runtime attribute-projection predicate (CUT A4) — consumed by
// @czap/compiler (ARIA compilation) and @czap/astro (runtime boundary attrs).
export { BoundaryAttribute } from './boundary-attribute.js';

// Token
export { Token } from './token.js';
export type { TokenCategory } from './token.js';

// Style
export { Style } from './style.js';
export type { StyleLayer, ShadowLayer } from './style.js';

// Theme
export { Theme } from './theme.js';

// Component
export { Component } from './component.js';
export type { SlotConfig } from './component.js';

// Signal
export { Signal } from './signal.js';
export type { SignalSourceType, SignalSource } from './signal.js';
// The sanctioned SignalSource <-> SignalInput bridge (source of truth for the
// input vocabulary; replaces every hand-rolled `input.startsWith(...)` fork).
export { sourceToInput, inputToSource, inputSourceType } from './signal-input.js';

// Easing
export { Easing } from './easing.js';

// Animation
export { Animation } from './animation.js';

// Timeline
export { Timeline } from './timeline.js';

// Quantizer types
export type { Quantizer } from './quantizer-types.js';

// Scheduler
export { Scheduler } from './scheduler.js';

// Compositor
export { Compositor } from './compositor.js';
export type { CompositeState, CompositorConfig } from './compositor.js';

// Compositor State Pool
export { CompositorStatePool } from './compositor-pool.js';

// Speculative Evaluation
export { SpeculativeEvaluator } from './speculative.js';

// Token Buffer
export { TokenBuffer } from './token-buffer.js';

// UI Quality
export { UIQuality } from './ui-quality.js';
export type { UIQualityTier, MotionTier } from './ui-quality.js';

// Generative UI Frames
export { GenFrame } from './gen-frame.js';
export type { UIFrame, FrameType, MorphStrategy, GapStrategy } from './gen-frame.js';

// Video
export { VideoRenderer } from './video.js';
export type { VideoConfig, VideoFrameOutput } from './video.js';

// Capture
export type { CaptureConfig, CaptureFrame, FrameCapture, CaptureResult } from './capture.js';

// Blend
export { BlendTree } from './blend.js';

// Frame budget
export { FrameBudget } from './frame-budget.js';
export type { Priority } from './frame-budget.js';

// Dirty tracking
export { DirtyFlags } from './dirty.js';

// Protocol
export type { CellKind, CellMeta, CellEnvelope } from './protocol.js';

// ECS
export type { Entity, System, DenseSystem, DenseStore } from './ecs.js';
export { Part, World, EntityId } from './ecs.js';

// Composable
export { Composable, ComposableWorld } from './composable.js';
export type { EntityComponents, ComposableEntity, ComposableWorldShape } from './composable.js';

// Cell
export { Cell } from './cell.js';

// Derived
export { Derived } from './derived.js';

// Zap
export { Zap } from './zap.js';

// Store
export { Store } from './store.js';

// Wire
export { Wire } from './wire.js';
export type { WireSocket } from './wire.js';

// Op
export { Op } from './op.js';

// Cap
export type { CapLevel, CapSet } from './caps.js';
export { Cap } from './caps.js';

// Escalation chooser (P5c) — the READER of PolicyNode (P2). Picks the minimal
// CapLevel rung a policy admits on a runtime site, gated by site/budgets/grants
// and the locally-encoded CapLevel↔target admissibility table (no quantizer
// import — that would close a core→quantizer cycle).
export { chooseRung } from './escalation.js';
export type { RungChoice, EscalationResult } from './escalation.js';

// HLC
export { HLC } from './hlc.js';

// VectorClock
export { VectorClock } from './vector-clock.js';

// TypedRef
export { TypedRef } from './typed-ref.js';

// Receipt
export type { ReceiptSubject, ReceiptEnvelope, ChainValidationError } from './receipt.js';
export { Receipt } from './receipt.js';

// DAG
export type { DAGNode, ReceiptDAG, MergeResult, ForkViolation } from './dag.js';
export { DAG } from './dag.js';

// Plan
export { Plan } from './plan.js';
export type { OpType, EdgeType } from './plan.js';

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
} from './document-graph.js';
// The DocumentGraph kernel — seal (mint ids), validate, and linearize (reused
// from the Plan kernel). `addressNode`/`addressDocumentGraph` stay module-local
// (sealNode/sealGraph wrap them; in-core consumers import them by relative path).
export { sealNode, sealGraph, validateGraph, linearizeGraph } from './document-graph-address.js';
// The one node well-formedness trust gate, shared by the AI proposal validator
// (ai-cast.ts) and the runtime graph loader (@czap/astro) — untrusted JSON, one
// schema. Factored out of ai-cast.ts so neither seam owns a drifting copy.
export { isWellFormedNode, DocumentGraphNodeSchema } from './document-graph-schema.js';
// The one content-addressing kernel (canonicalize → CanonicalCbor → fnv1a),
// shared by EntityId, DocumentGraph ids, and downstream GraphPatch re-addressing.
export { contentAddressOf } from './content-address.js';

// ── GraphPatch — typed graph mutation + structural differ (P5b) ─────────────
// Tagged-delta over DocumentGraph: propose/apply (re-address via sealGraph) /
// preview / validate / diff (round-trips) / receipt / forkOf. The interface +
// namespace-object value merge into one `GraphPatch` symbol (ADR-0001), exactly
// like `Plan`. Kept in a small block so a 3-way merge with sibling phases editing
// this region is trivial.
export { GraphPatch } from './graph-patch.js';
export type { PatchOp, NodePatchOp, EdgePatchOp } from './graph-patch.js';
// ── end GraphPatch (P5b) ────────────────────────────────────────────────────

// ── AI cast — the framework PRIMITIVE: graph→context/schema→validated proposal ─
// "LiteShip teaches graphs how to speak to models; products decide whether model
// suggestions become action." `AICast.castContext` casts a DocumentGraph OUT to a
// content-addressed, token-budgeted model-facing context (advertising the
// GraphPatch schema as the model's output contract); the validators cast IN,
// minting a `ValidatedProposal` (the security envelope) that the host-authorized
// `applyValidatedPatch` is the ONLY consumer of. NO auto-apply, NO network.
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
// The shared validated-model-output envelope (one discipline for GraphPatch AND
// genui GeneratedUITree proposals). `ValidatedProposal`/`ApplyToken` are exported
// as CONSUMER types only — `mintValidated` (the sole token mint site) is NOT
// re-exported, so the envelope stays un-forgeable outside the validators.
export type { ValidatedProposal, ApplyToken, ProposalTarget } from './validated-output.js';
// `assertTokenBinds` re-derives the token binding (the host-side swap guard);
// `unwrapValidated` is the generated-UI apply SEAM (open question #1) — the same
// binding guard named for the host's intent: it hands back the validated payload
// for the host's OWN renderer/applier (core stays renderer-free, never invokes
// apply). `proposalSubject` exposes the citable content-address; `proposalReceiptSubject`
// derives the `ReceiptSubject` a host seeds its receipt DAG with (open question #7
// — a real sync seam onto the existing receipt machinery, not the async envelope).
export { assertTokenBinds, unwrapValidated, proposalSubject, proposalReceiptSubject } from './validated-output.js';
// ── end AI cast ─────────────────────────────────────────────────────────────

// Runtime coordination
export { RuntimeCoordinator } from './runtime-coordinator.js';
export type { RuntimePhase, RuntimeCoordinatorConfig } from './runtime-coordinator.js';

// Codec
export { Codec } from './codec.js';
// `SchemaError` / `isSchemaError` removed from the main entry — they were
// orphan re-exports from `effect/Schema` with no consumers in the repo
// and added implicit coupling to an Effect internal sub-path. Consumers
// who need them should import directly from `effect/Schema`.

// LiveCell
export { LiveCell } from './live-cell.js';

// WASM Dispatch
export { WASMDispatch } from './wasm-dispatch.js';
export type { WASMKernels, WASMDispatchAPI } from './wasm-dispatch.js';
export { fallbackKernels } from './wasm-fallback.js';

// AVBridge
export { AVBridge } from './av-bridge.js';

// AVRenderer
export { AVRenderer } from './av-renderer.js';

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
} from './defaults.js';

// Validation error
export { CzapValidationError, isValidationError } from './validation-error.js';

// Diagnostics
export { Diagnostics } from './diagnostics.js';
export type { DiagnosticEvent, DiagnosticLevel, DiagnosticPayload, DiagnosticsSink } from './diagnostics.js';

// AddressedDigest + ShipCapsule (ADR-0011)
// Browser-bundleable: pure type + crypto.subtle hashing. The Node-only
// release-input manifest helpers (gzip/tar/yaml) live in @czap/cli.
export { AddressedDigest } from './addressed-digest.js';
export { ShipCapsule } from './ship-capsule.js';

// Type guards
import type { Cell as _Cell } from './cell.js';
import type { Derived as _Derived } from './derived.js';
import type { Zap as _Zap } from './zap.js';
import type { Wire as _Wire } from './wire.js';

/** Union of the four reactive primitives the CZAP graph exposes to user code. */
export type Primitive<T> = _Cell.Shape<T> | _Derived.Shape<T> | _Zap.Shape<T> | _Wire.Shape<T>;

/** Narrow a {@link Primitive} to a {@link Cell}. */
export const isCell = <T>(p: Primitive<T>): p is _Cell.Shape<T> => p._tag === 'Cell';
/** Narrow a {@link Primitive} to a {@link Derived}. */
export const isDerived = <T>(p: Primitive<T>): p is _Derived.Shape<T> => p._tag === 'Derived';
/** Narrow a {@link Primitive} to a {@link Zap}. */
export const isZap = <T>(p: Primitive<T>): p is _Zap.Shape<T> => p._tag === 'Zap';
/** Narrow a {@link Primitive} to a {@link Wire}. */
export const isWire = <T>(p: Primitive<T>): p is _Wire.Shape<T> => p._tag === 'Wire';

// Config hub
export { Config, defineConfig } from './config.js';
export type { PrimitiveKind, PluginConfig as CorePluginConfig, AstroConfig as CoreAstroConfig } from './config.js';

// Capsule factory base types
export type {
  AssemblyKind,
  Site,
  CapabilityDecl,
  BudgetDecl,
  Invariant,
  AttributionDecl,
  CapsuleContract,
} from './capsule.js';

export { TypeValidator } from './capsule.js';

export { defineCapsule, getCapsuleCatalog } from './assembly.js';
export type { CapsuleDef } from './assembly.js';
// `resetCapsuleCatalog` is intentionally NOT re-exported here — it mutates
// global registry state and ships from `@czap/core/testing` only.

// Capsule declarations — concrete instances of the 7-arm factory
export { boundaryEvaluateCapsule } from './capsules/boundary-evaluate.js';
export { tokenBufferCapsule } from './capsules/token-buffer.js';
export { canonicalCborCapsule } from './capsules/canonical-cbor.js';
// The strict decoder capsule (P5a) — the encoder's round-trip peer. Exported
// here so it registers in the live `getCapsuleCatalog()` alongside the encoder
// (the reader the encoder's content-addressed bytes have lacked).
export { canonicalCborDecodeCapsule } from './capsules/canonical-cbor-decode.js';
// The GraphPatch round-trip identity capsule (F) — locks `apply(a, diff(a, b))`
// deep-equals `b` as a standing pureTransform contract. Exported here so it
// registers in the live `getCapsuleCatalog()` (the contract the future graph
// editor builds against).
export { graphPatchIdentityCapsule } from './capsules/graph-patch-identity.js';
// The escalation chooser capsule — locks `chooseRung`'s minimal-downgrade law
// (never escalates above `requires`), the site gate, determinism, and the
// fresh-Set memoization scar as a standing pureTransform contract. Exported here
// so it registers in the live `getCapsuleCatalog()`.
export { escalationChooseRungCapsule } from './capsules/escalation-choose-rung.js';
// The DocumentGraph addressing capsule — locks `addressDocumentGraph`'s
// determinism, fnv1a format, and order-independence (the CUT B1 code-unit
// regression guard) as a standing pureTransform contract. Exported here so it
// registers in the live `getCapsuleCatalog()`.
export { documentGraphAddressCapsule } from './capsules/document-graph-address.js';
// The AI cast summarizer capsule — locks `summarizeGraph`'s determinism, budget
// honesty (estimatedTokens ≤ budget), budget monotonicity (a smaller budget never
// yields a larger summary), and node-count honesty as a standing pureTransform
// contract. Exported here so it registers in the live `getCapsuleCatalog()`.
export { aiCastSummarizeCapsule } from './capsules/ai-cast-summarize.js';
// The AI cast proposal-envelope capsule — locks the LOAD-BEARING security laws:
// no-bypass (a tampered proposal is refused at apply), apply-accepts-only-minted-
// token, validated-proposal determinism (stable subject + result id), valid-applies-
// and-re-addresses, and rejection-never-mints — as a standing pureTransform contract.
// Exported here so it registers in the live `getCapsuleCatalog()`.
export { aiCastProposalCapsule } from './capsules/ai-cast-proposal.js';

// Harness lives at `@czap/core/harness` — per-arm test + bench template
// generators. Not re-exported here so consumers don't pull fast-check and
// the code-gen surface into every bundle.
