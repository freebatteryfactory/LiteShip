/**
 * `liteship/runtime` — the curated facade over `@liteship/web`: the DOM client
 * runtime that stitches LiteShip projections (CSS, streamed HTML, LLM chunks,
 * workers) into a live browser document. Morph diffing, slot addressing, the
 * SSE/resumption client, the LLM chunk normalizers, physical state capture, the
 * DPU verifiable-patch path, capture helpers, and the typed `liteship:*` wire
 * contract. Curated named re-exports only — no behavior lives here.
 * @module
 */

export type {
  SlotPath,
  IslandMode,
  SlotEntry,
  SlotEntryInput,
  PhysicalState,
  FocusState,
  ScrollPosition,
  SelectionState,
  IMEState,
  MorphHints,
  MorphConfig,
  MorphCallbacks,
  MorphResult,
  MorphRejection,
  SSEState,
  SSEConfig,
  ReconnectConfig,
  BackpressureHint,
  OverflowPolicy,
  SSEMessage,
  ResumptionConfig,
  ResumptionState,
  ResumptionStateInput,
  ResumeResponse,
  MatchPriority,
  MatchResult,
  HtmlPolicy,
  RuntimeEndpointKind,
  RuntimeEndpointPolicy,
} from '@liteship/web';

export { Morph } from '@liteship/web';
export { SemanticId } from '@liteship/web';
export { Hints } from '@liteship/web';
export { MorphOpaque } from '@liteship/web';
export { bindGraphForm } from '@liteship/web';
export type { BindGraphFormOptions } from '@liteship/web';
export { createHtmlFragment, escapeHtml, resolveHtmlString, sanitizeHTML } from '@liteship/web';
export { isFetchableRuntimeUrl, isPrivateOrReservedIP, resolveRuntimeUrl } from '@liteship/web';
export type { RuntimeUrlResolution } from '@liteship/web';
export {
  parseShaderIntegrity,
  verifyShaderIntegrity,
  computeShaderIntegrity,
  isExternalShaderSource,
  decideShaderIntegrity,
  DEFAULT_SHADER_INTEGRITY_MODE,
} from '@liteship/web';
export type { ShaderIntegrity, IntegrityResult, ShaderIntegrityMode, IntegrityDecision } from '@liteship/web';
export {
  watchAndPrepare,
  detectDpuCapability,
  stampVerifiablePatch,
  verifyVerifiablePatch,
  applyVerifiablePatch,
  applyVerifiablePatchAndAdopt,
  digestHtmlFragment,
  DPU_MARKER_ATTR,
  DPU_BASE_ATTR,
  DPU_RESULT_ATTR,
  DPU_DIGEST_ATTR,
} from '@liteship/web';
export type {
  DpuTier,
  DpuCapability,
  VerifiablePatchEnvelope,
  VerifiablePatchVerification,
  ApplyVerifiablePatchResult,
  ApplyVerifiablePatchAdoptResult,
  DpuAdoptClient,
  WatchAndPrepareHandle,
} from '@liteship/web';

export { SlotRegistry } from '@liteship/web';
export type { SlotRegistryShape } from '@liteship/web';
export { SlotAddressing } from '@liteship/web';

export type { SSEClient, SSEEventSource } from '@liteship/web';
export { SSE } from '@liteship/web';
export { Resumption } from '@liteship/web';
export {
  fetchSnapshot,
  applyDiscreteSnapshotSignals,
  adoptRefreshedGraphBase,
  runGraphNativeRecovery,
  applyGraphNativeSnapshot,
  supplementReplayIfSignalsDropped,
  bindRequestSnapshotRecovery,
} from '@liteship/web';
export type { StreamRecoveryMutationClient, StreamRecoveryHandlers, StreamRecoveryOptions } from '@liteship/web';
export { registerStreamRecoverySubstrate, getStreamRecoverySubstrate, recordStreamPatchReceipt } from '@liteship/web';
export type { StreamRecoverySubstrate, ResolvedStreamRecoverySubstrate } from '@liteship/web';

export { Physical } from '@liteship/web';

export { WebCodecsCapture, renderToCanvas, captureVideo } from '@liteship/web';
export type { WebCodecsCaptureOptions, RenderFn } from '@liteship/web';

export { LLMAdapter } from '@liteship/web';
export type { LLMChunk, LLMChunkType, ChunkParser, LLMStreamConfig, LLMAdapterShape } from '@liteship/web';
export { LLMChunkNormalization } from '@liteship/web';
export type { ToolCallAccumulator } from '@liteship/web';

export { createAudioProcessor } from '@liteship/web';
export type { AudioProcessor } from '@liteship/web';

export type {
  LiteshipEventDetailMap,
  LiteshipEventDisposer,
  LiteshipEventName,
  LiteshipMorphRejectedDetail,
  LiteshipStreamErrorDetail,
  LiteshipUniformUpdateDetail,
  StreamWireAttrKey,
  StreamWireAttribute,
} from '@liteship/web';
export {
  LITESHIP_EVENT_DOCS,
  LITESHIP_EVENT_NAMES,
  STREAM_WIRE_ATTRIBUTE_DOCS,
  STREAM_WIRE_ATTRIBUTES,
  STREAM_WIRE_ATTR_KEYS,
  dispatchLiteshipEvent,
  onLiteship,
  renderWireContractDoc,
  streamWireAttr,
} from '@liteship/web';
