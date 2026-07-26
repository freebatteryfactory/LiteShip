[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / liteship/src/evidence

# liteship/src/evidence

`liteship/evidence` — the curated facade over `@liteship/core/evidence`: the
attestation + quality vocabulary. Receipts, the validated-output apply envelope
(consumer symbols only — the minter stays private), the escalation chooser,
diagnostics, capture, content-addressing, the addressed digest, the quality-tier
scale, capabilities, and UI quality. Curated named re-exports only — no behavior
lives here.

## Namespaces

- [Diagnostics](namespaces/Diagnostics/README.md)
- [Receipt](namespaces/Receipt/README.md)
- [UIQuality](namespaces/UIQuality/README.md)

## Interfaces

- [ApplyToken](interfaces/ApplyToken.md)
- [CapSet](interfaces/CapSet.md)
- [CaptureConfig](interfaces/CaptureConfig.md)
- [CaptureFrame](interfaces/CaptureFrame.md)
- [CaptureResult](interfaces/CaptureResult.md)
- [ChainValidationOptions](interfaces/ChainValidationOptions.md)
- [DiagnosticEvent](interfaces/DiagnosticEvent.md)
- [DiagnosticPayload](interfaces/DiagnosticPayload.md)
- [DiagnosticsSink](interfaces/DiagnosticsSink.md)
- [Finding](interfaces/Finding.md)
- [FrameCapture](interfaces/FrameCapture.md)
- [ReceiptEnvelope](interfaces/ReceiptEnvelope.md)
- [ReceiptInspection](interfaces/ReceiptInspection.md)
- [ReceiptSubject](interfaces/ReceiptSubject.md)
- [TierChoice](interfaces/TierChoice.md)
- [ValidatedProposal](interfaces/ValidatedProposal.md)

## Type Aliases

- [AddressedDigest](type-aliases/AddressedDigest.md)
- [Cap](type-aliases/Cap.md)
- [CapTier](type-aliases/CapTier.md)
- [ChainValidationError](type-aliases/ChainValidationError.md)
- [DiagnosticCode](type-aliases/DiagnosticCode.md)
- [DiagnosticLevel](type-aliases/DiagnosticLevel.md)
- [EscalationResult](type-aliases/EscalationResult.md)
- [ProposalTarget](type-aliases/ProposalTarget.md)
- [QualityTierTarget](type-aliases/QualityTierTarget.md)
- [UIQuality](type-aliases/UIQuality.md)
- [UIQualityTier](type-aliases/UIQualityTier.md)

## Variables

- [AddressedDigest](variables/AddressedDigest.md)
- [Cap](variables/Cap.md)
- [Diagnostics](variables/Diagnostics.md)
- [inspectReceipt](variables/inspectReceipt.md)
- [QUALITY\_TIER\_COUNT](variables/QUALITY_TIER_COUNT.md)
- [QUALITY\_TIER\_TARGETS](variables/QUALITY_TIER_TARGETS.md)
- [Receipt](variables/Receipt.md)
- [UIQuality](variables/UIQuality.md)

## Functions

- [assertTokenBinds](functions/assertTokenBinds.md)
- [canonicalAddressBytes](functions/canonicalAddressBytes.md)
- [chooseTier](functions/chooseTier.md)
- [contentAddressOf](functions/contentAddressOf.md)
- [projectQualityTiers](functions/projectQualityTiers.md)
- [proposalReceiptSubject](functions/proposalReceiptSubject.md)
- [proposalSubject](functions/proposalSubject.md)
- [tierTargets](functions/tierTargets.md)
- [unwrapValidated](functions/unwrapValidated.md)

## References

### MotionTier

Re-exports [MotionTier](../../../quantizer/src/type-aliases/MotionTier.md)
