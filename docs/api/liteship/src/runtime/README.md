[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / liteship/src/runtime

# liteship/src/runtime

`liteship/runtime` — the curated facade over `@liteship/web`: the DOM client
runtime that stitches LiteShip projections (CSS, streamed HTML, LLM chunks,
workers) into a live browser document. Morph diffing, slot addressing, the
SSE/resumption client, the LLM chunk normalizers, physical state capture, the
DPU verifiable-patch path, capture helpers, and the typed `liteship:*` wire
contract. Curated named re-exports only — no behavior lives here.

## Namespaces

- [LLMAdapter](namespaces/LLMAdapter/README.md)

## Interfaces

- [AudioProcessor](interfaces/AudioProcessor.md)
- [BackpressureHint](interfaces/BackpressureHint.md)
- [BindGraphFormOptions](interfaces/BindGraphFormOptions.md)
- [DpuAdoptClient](interfaces/DpuAdoptClient.md)
- [FocusState](interfaces/FocusState.md)
- [IMEState](interfaces/IMEState.md)
- [LLMAdapter](interfaces/LLMAdapter.md)
- [LLMChunk](interfaces/LLMChunk.md)
- [LLMStreamConfig](interfaces/LLMStreamConfig.md)
- [MatchResult](interfaces/MatchResult.md)
- [MorphCallbacks](interfaces/MorphCallbacks.md)
- [MorphConfig](interfaces/MorphConfig.md)
- [MorphHints](interfaces/MorphHints.md)
- [MorphRejection](interfaces/MorphRejection.md)
- [PhysicalState](interfaces/PhysicalState.md)
- [PhysicalStateTracker](interfaces/PhysicalStateTracker.md)
- [ReconnectConfig](interfaces/ReconnectConfig.md)
- [ResolvedStreamRecoverySubstrate](interfaces/ResolvedStreamRecoverySubstrate.md)
- [ResumptionConfig](interfaces/ResumptionConfig.md)
- [ResumptionState](interfaces/ResumptionState.md)
- [RuntimeEndpointPolicy](interfaces/RuntimeEndpointPolicy.md)
- [ScrollPosition](interfaces/ScrollPosition.md)
- [SelectionState](interfaces/SelectionState.md)
- [ShaderIntegrity](interfaces/ShaderIntegrity.md)
- [SlotEntry](interfaces/SlotEntry.md)
- [SlotEntryInput](interfaces/SlotEntryInput.md)
- [SlotRegistry](interfaces/SlotRegistry.md)
- [SSEClient](interfaces/SSEClient.md)
- [SSEConfig](interfaces/SSEConfig.md)
- [SSEEventSource](interfaces/SSEEventSource.md)
- [StreamRecoveryHandlers](interfaces/StreamRecoveryHandlers.md)
- [StreamRecoveryOptions](interfaces/StreamRecoveryOptions.md)
- [StreamRecoverySubstrate](interfaces/StreamRecoverySubstrate.md)
- [VerifiablePatchEnvelope](interfaces/VerifiablePatchEnvelope.md)
- [WatchAndPrepareHandle](interfaces/WatchAndPrepareHandle.md)
- [WebCodecsCaptureOptions](interfaces/WebCodecsCaptureOptions.md)

## Type Aliases

- [ApplyVerifiablePatchAdoptResult](type-aliases/ApplyVerifiablePatchAdoptResult.md)
- [ApplyVerifiablePatchResult](type-aliases/ApplyVerifiablePatchResult.md)
- [ChunkParser](type-aliases/ChunkParser.md)
- [DpuCapability](type-aliases/DpuCapability.md)
- [DpuTier](type-aliases/DpuTier.md)
- [HtmlPolicy](type-aliases/HtmlPolicy.md)
- [IntegrityDecision](type-aliases/IntegrityDecision.md)
- [IntegrityResult](type-aliases/IntegrityResult.md)
- [IslandMode](type-aliases/IslandMode.md)
- [LiteshipEventDetailMap](type-aliases/LiteshipEventDetailMap.md)
- [LiteshipEventDisposer](type-aliases/LiteshipEventDisposer.md)
- [LiteshipEventName](type-aliases/LiteshipEventName.md)
- [LiteshipStreamErrorDetail](type-aliases/LiteshipStreamErrorDetail.md)
- [LiteshipUniformUpdateDetail](type-aliases/LiteshipUniformUpdateDetail.md)
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
- [VerifiablePatchVerification](type-aliases/VerifiablePatchVerification.md)

## Variables

- [adoptRefreshedGraphBase](variables/adoptRefreshedGraphBase.md)
- [applyDiscreteSnapshotSignals](variables/applyDiscreteSnapshotSignals.md)
- [applyGraphNativeSnapshot](variables/applyGraphNativeSnapshot.md)
- [bindRequestSnapshotRecovery](variables/bindRequestSnapshotRecovery.md)
- [DEFAULT\_SHADER\_INTEGRITY\_MODE](variables/DEFAULT_SHADER_INTEGRITY_MODE.md)
- [DPU\_BASE\_ATTR](variables/DPU_BASE_ATTR.md)
- [DPU\_DIGEST\_ATTR](variables/DPU_DIGEST_ATTR.md)
- [DPU\_MARKER\_ATTR](variables/DPU_MARKER_ATTR.md)
- [DPU\_RESULT\_ATTR](variables/DPU_RESULT_ATTR.md)
- [fetchSnapshot](variables/fetchSnapshot.md)
- [Hints](variables/Hints.md)
- [LITESHIP\_EVENT\_DOCS](variables/LITESHIP_EVENT_DOCS.md)
- [LITESHIP\_EVENT\_NAMES](variables/LITESHIP_EVENT_NAMES.md)
- [LLMAdapter](variables/LLMAdapter.md)
- [LLMChunkNormalization](variables/LLMChunkNormalization.md)
- [Morph](variables/Morph.md)
- [MorphOpaque](variables/MorphOpaque.md)
- [Physical](variables/Physical.md)
- [Resumption](variables/Resumption.md)
- [runGraphNativeRecovery](variables/runGraphNativeRecovery.md)
- [SemanticId](variables/SemanticId.md)
- [SlotAddressing](variables/SlotAddressing.md)
- [SlotRegistry](variables/SlotRegistry.md)
- [SSE](variables/SSE.md)
- [STREAM\_WIRE\_ATTR\_KEYS](variables/STREAM_WIRE_ATTR_KEYS.md)
- [STREAM\_WIRE\_ATTRIBUTE\_DOCS](variables/STREAM_WIRE_ATTRIBUTE_DOCS.md)
- [STREAM\_WIRE\_ATTRIBUTES](variables/STREAM_WIRE_ATTRIBUTES.md)
- [supplementReplayIfSignalsDropped](variables/supplementReplayIfSignalsDropped.md)

## Functions

- [applyVerifiablePatch](functions/applyVerifiablePatch.md)
- [applyVerifiablePatchAndAdopt](functions/applyVerifiablePatchAndAdopt.md)
- [bindGraphForm](functions/bindGraphForm.md)
- [captureVideo](functions/captureVideo.md)
- [computeShaderIntegrity](functions/computeShaderIntegrity.md)
- [createAudioProcessor](functions/createAudioProcessor.md)
- [createHtmlFragment](functions/createHtmlFragment.md)
- [createPhysicalStateTracker](functions/createPhysicalStateTracker.md)
- [createWebCodecsCapture](functions/createWebCodecsCapture.md)
- [decideShaderIntegrity](functions/decideShaderIntegrity.md)
- [detectDpuCapability](functions/detectDpuCapability.md)
- [digestHtmlFragment](functions/digestHtmlFragment.md)
- [dispatchLiteshipEvent](functions/dispatchLiteshipEvent.md)
- [escapeHtml](functions/escapeHtml.md)
- [getStreamRecoverySubstrate](functions/getStreamRecoverySubstrate.md)
- [isExternalShaderSource](functions/isExternalShaderSource.md)
- [isFetchableRuntimeUrl](functions/isFetchableRuntimeUrl.md)
- [isPrivateOrReservedIP](functions/isPrivateOrReservedIP.md)
- [onLiteship](functions/onLiteship.md)
- [parseShaderIntegrity](functions/parseShaderIntegrity.md)
- [recordStreamPatchReceipt](functions/recordStreamPatchReceipt.md)
- [registerStreamRecoverySubstrate](functions/registerStreamRecoverySubstrate.md)
- [renderToCanvas](functions/renderToCanvas.md)
- [renderWireContractDoc](functions/renderWireContractDoc.md)
- [resolveHtmlString](functions/resolveHtmlString.md)
- [resolveRuntimeUrl](functions/resolveRuntimeUrl.md)
- [sanitizeHTML](functions/sanitizeHTML.md)
- [stampVerifiablePatch](functions/stampVerifiablePatch.md)
- [streamWireAttr](functions/streamWireAttr.md)
- [verifyShaderIntegrity](functions/verifyShaderIntegrity.md)
- [verifyVerifiablePatch](functions/verifyVerifiablePatch.md)
- [watchAndPrepare](functions/watchAndPrepare.md)

## References

### LiteshipMorphRejectedDetail

Re-exports [LiteshipMorphRejectedDetail](../../../web/src/type-aliases/LiteshipMorphRejectedDetail.md)
