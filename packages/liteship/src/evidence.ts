/**
 * `liteship/evidence` — the curated facade over `@liteship/core/evidence`: the
 * attestation + quality vocabulary. Receipts, the validated-output apply envelope
 * (consumer symbols only — the minter stays private), the escalation chooser,
 * diagnostics, capture, content-addressing, the addressed digest, the quality-tier
 * scale, capabilities, and UI quality. Curated named re-exports only — no behavior
 * lives here.
 * @module
 */

export { UIQuality } from '@liteship/core/evidence';
export type { UIQualityTier, MotionTier } from '@liteship/core/evidence';

export type { CaptureConfig, CaptureFrame, FrameCapture, CaptureResult } from '@liteship/core/evidence';

export type { CapTier, CapSet } from '@liteship/core/evidence';
export { Cap } from '@liteship/core/evidence';

export { QUALITY_TIER_TARGETS, QUALITY_TIER_COUNT, projectQualityTiers } from '@liteship/core/evidence';
export type { QualityTierTarget } from '@liteship/core/evidence';

export { chooseTier } from '@liteship/core/evidence';
export { tierTargets } from '@liteship/core/evidence';
export type { TierChoice, EscalationResult } from '@liteship/core/evidence';

export type {
  ReceiptSubject,
  ReceiptEnvelope,
  ChainValidationError,
  ChainValidationOptions,
} from '@liteship/core/evidence';
export { Receipt } from '@liteship/core/evidence';
export { inspectReceipt } from '@liteship/core/evidence';
export type { ReceiptInspection } from '@liteship/core/evidence';

export { contentAddressOf, canonicalAddressBytes } from '@liteship/core/evidence';

export type { ValidatedProposal, ApplyToken, ProposalTarget } from '@liteship/core/evidence';
export { assertTokenBinds, unwrapValidated, proposalSubject, proposalReceiptSubject } from '@liteship/core/evidence';

export { Diagnostics } from '@liteship/core/evidence';
export type { DiagnosticEvent, DiagnosticLevel, DiagnosticPayload, DiagnosticsSink } from '@liteship/core/evidence';

export { AddressedDigest } from '@liteship/core/evidence';

export type { Finding } from '@liteship/gauntlet';
export type { DiagnosticCode } from '@liteship/error';
