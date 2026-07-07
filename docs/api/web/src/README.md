[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / web/src

# web/src

`@czap/web` — DOM runtime for **LiteShip**: stitches **CZAP** projections
(CSS, streamed HTML, LLM chunks, workers) into a live browser document.

It ships:

- [Morph](variables/Morph.md): idiomorph-style DOM diffing that preserves focus,
  scroll, and form state across re-renders.
- [SlotRegistry](namespaces/SlotRegistry/README.md) / [SlotAddressing](variables/SlotAddressing.md): stable addressing
  for server-rendered slots in streaming HTML.
- [SSE](variables/SSE.md) / [Resumption](variables/Resumption.md): an Effect-scoped Server-Sent
  Events client with reconnect and cross-tab resumption.
- [LLMAdapter](namespaces/LLMAdapter/README.md) and [LLMChunkNormalization](variables/LLMChunkNormalization.md): normalization
  of streaming LLM chunk formats (OpenAI / Anthropic / AI SDK).
- [Physical](variables/Physical.md): DOM state capture and restore for hot reloads.
- `WebCodecs` / `Mediabunny` capture helpers for client-side recording.
- `createAudioProcessor` for AudioWorklet-based real-time audio graphs.

## Namespaces

- [LLMAdapter](namespaces/LLMAdapter/README.md)
- [SlotRegistry](namespaces/SlotRegistry/README.md)
- [WebCodecsCapture](namespaces/WebCodecsCapture/README.md)

## Interfaces

- [AudioProcessor](interfaces/AudioProcessor.md)
- [BackpressureHint](interfaces/BackpressureHint.md)
- [BindGraphFormOptions](interfaces/BindGraphFormOptions.md)
- [CzapEventDetailMap](interfaces/CzapEventDetailMap.md)
- [CzapMorphRejectedDetail](interfaces/CzapMorphRejectedDetail.md)
- [CzapStreamErrorDetail](interfaces/CzapStreamErrorDetail.md)
- [CzapUniformUpdateDetail](interfaces/CzapUniformUpdateDetail.md)
- [FocusState](interfaces/FocusState.md)
- [IMEState](interfaces/IMEState.md)
- [LLMAdapterShape](interfaces/LLMAdapterShape.md)
- [LLMChunk](interfaces/LLMChunk.md)
- [LLMStreamConfig](interfaces/LLMStreamConfig.md)
- [MatchResult](interfaces/MatchResult.md)
- [MorphCallbacks](interfaces/MorphCallbacks.md)
- [MorphConfig](interfaces/MorphConfig.md)
- [MorphHints](interfaces/MorphHints.md)
- [MorphRejection](interfaces/MorphRejection.md)
- [PhysicalState](interfaces/PhysicalState.md)
- [ReconnectConfig](interfaces/ReconnectConfig.md)
- [ResumptionConfig](interfaces/ResumptionConfig.md)
- [ResumptionState](interfaces/ResumptionState.md)
- [RuntimeEndpointPolicy](interfaces/RuntimeEndpointPolicy.md)
- [ScrollPosition](interfaces/ScrollPosition.md)
- [SelectionState](interfaces/SelectionState.md)
- [ShaderIntegrity](interfaces/ShaderIntegrity.md)
- [SlotEntry](interfaces/SlotEntry.md)
- [SlotEntryInput](interfaces/SlotEntryInput.md)
- [SlotRegistryShape](interfaces/SlotRegistryShape.md)
- [SSEClient](interfaces/SSEClient.md)
- [SSEConfig](interfaces/SSEConfig.md)
- [SSEEventSource](interfaces/SSEEventSource.md)
- [StreamRecoveryHandlers](interfaces/StreamRecoveryHandlers.md)
- [StreamRecoveryOptions](interfaces/StreamRecoveryOptions.md)
- [WebCodecsCaptureOptions](interfaces/WebCodecsCaptureOptions.md)

## Type Aliases

- [ChunkParser](type-aliases/ChunkParser.md)
- [CzapEventDisposer](type-aliases/CzapEventDisposer.md)
- [CzapEventName](type-aliases/CzapEventName.md)
- [HtmlPolicy](type-aliases/HtmlPolicy.md)
- [IntegrityDecision](type-aliases/IntegrityDecision.md)
- [IntegrityResult](type-aliases/IntegrityResult.md)
- [IslandMode](type-aliases/IslandMode.md)
- [LLMChunkType](type-aliases/LLMChunkType.md)
- [MatchPriority](type-aliases/MatchPriority.md)
- [MorphResult](type-aliases/MorphResult.md)
- [OverflowPolicy](type-aliases/OverflowPolicy.md)
- [RenderFn](type-aliases/RenderFn.md)
- [ResumeResponse](type-aliases/ResumeResponse.md)
- [ResumptionStateInput](type-aliases/ResumptionStateInput.md)
- [RuntimeEndpointKind](type-aliases/RuntimeEndpointKind.md)
- [RuntimeUrlResolution](type-aliases/RuntimeUrlResolution.md)
- [ShaderIntegrityMode](type-aliases/ShaderIntegrityMode.md)
- [SlotPath](type-aliases/SlotPath.md)
- [SlotPath](type-aliases/SlotPath-1.md)
- [SSEMessage](type-aliases/SSEMessage.md)
- [SSEState](type-aliases/SSEState.md)
- [StreamRecoveryMutationClient](type-aliases/StreamRecoveryMutationClient.md)
- [StreamWireAttribute](type-aliases/StreamWireAttribute.md)
- [StreamWireAttrKey](type-aliases/StreamWireAttrKey.md)
- [ToolCallAccumulator](type-aliases/ToolCallAccumulator.md)

## Variables

- [CZAP\_EVENT\_DOCS](variables/CZAP_EVENT_DOCS.md)
- [CZAP\_EVENT\_NAMES](variables/CZAP_EVENT_NAMES.md)
- [DEFAULT\_SHADER\_INTEGRITY\_MODE](variables/DEFAULT_SHADER_INTEGRITY_MODE.md)
- [Hints](variables/Hints.md)
- [LLMAdapter](variables/LLMAdapter.md)
- [LLMChunkNormalization](variables/LLMChunkNormalization.md)
- [Morph](variables/Morph.md)
- [MorphOpaque](variables/MorphOpaque.md)
- [Physical](variables/Physical.md)
- [Resumption](variables/Resumption.md)
- [SemanticId](variables/SemanticId.md)
- [SlotAddressing](variables/SlotAddressing.md)
- [SlotRegistry](variables/SlotRegistry.md)
- [SSE](variables/SSE.md)
- [STREAM\_WIRE\_ATTR\_KEYS](variables/STREAM_WIRE_ATTR_KEYS.md)
- [STREAM\_WIRE\_ATTRIBUTE\_DOCS](variables/STREAM_WIRE_ATTRIBUTE_DOCS.md)
- [STREAM\_WIRE\_ATTRIBUTES](variables/STREAM_WIRE_ATTRIBUTES.md)
- [streamReceiptCapsule](variables/streamReceiptCapsule.md)
- [WebCodecsCapture](variables/WebCodecsCapture.md)

## Functions

- [adoptRefreshedGraphBase](functions/adoptRefreshedGraphBase.md)
- [applyDiscreteSnapshotSignals](functions/applyDiscreteSnapshotSignals.md)
- [applyGraphNativeSnapshot](functions/applyGraphNativeSnapshot.md)
- [bindGraphForm](functions/bindGraphForm.md)
- [bindRequestSnapshotRecovery](functions/bindRequestSnapshotRecovery.md)
- [captureVideo](functions/captureVideo.md)
- [createAudioProcessor](functions/createAudioProcessor.md)
- [createHtmlFragment](functions/createHtmlFragment.md)
- [decideShaderIntegrity](functions/decideShaderIntegrity.md)
- [dispatchCzapEvent](functions/dispatchCzapEvent.md)
- [fetchSnapshot](functions/fetchSnapshot.md)
- [isExternalShaderSource](functions/isExternalShaderSource.md)
- [isFetchableRuntimeUrl](functions/isFetchableRuntimeUrl.md)
- [isPrivateOrReservedIP](functions/isPrivateOrReservedIP.md)
- [onCzap](functions/onCzap.md)
- [parseShaderIntegrity](functions/parseShaderIntegrity.md)
- [renderToCanvas](functions/renderToCanvas.md)
- [renderWireContractDoc](functions/renderWireContractDoc.md)
- [resolveHtmlString](functions/resolveHtmlString.md)
- [resolveRuntimeUrl](functions/resolveRuntimeUrl.md)
- [runGraphNativeRecovery](functions/runGraphNativeRecovery.md)
- [sanitizeHTML](functions/sanitizeHTML.md)
- [streamWireAttr](functions/streamWireAttr.md)
- [supplementReplayIfSignalsDropped](functions/supplementReplayIfSignalsDropped.md)
- [verifyShaderIntegrity](functions/verifyShaderIntegrity.md)
