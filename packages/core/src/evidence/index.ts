/**
 * `@liteship/core/evidence` — the attestation + quality vocabulary: receipts,
 * the validated-output apply envelope (consumer symbols only — the minter stays
 * private), the escalation chooser, diagnostics, capture, content-addressing,
 * the addressed digest, the quality-tier scale, capabilities, and UI quality.
 * Curated named re-exports only — no behavior lives here.
 * @module
 */

export { UIQuality } from './ui-quality.js';

export type { UIQualityTier, MotionTier } from './ui-quality.js';

export type { CaptureConfig, CaptureFrame, FrameCapture, CaptureResult } from './capture.js';

export type { CapTier, CapSet } from './caps.js';

export { Cap } from './caps.js';

export { QUALITY_TIER_TARGETS, QUALITY_TIER_COUNT, projectQualityTiers } from './quality-tiers.js';

export type { QualityTierTarget } from './quality-tiers.js';

export { chooseTier, tierTargets } from './escalation.js';

export type { TierChoice, EscalationResult } from './escalation.js';

export type {
  ReceiptSubject,
  ReceiptEnvelope,
  ChainValidationError,
  ChainValidationOptions,
  ReceiptInspection,
} from './receipt.js';

export { Receipt, inspectReceipt } from './receipt.js';

export { contentAddressOf, canonicalAddressBytes } from './content-address.js';

export type { ValidatedProposal, ApplyToken, ProposalTarget } from './validated-output.js';

export { assertTokenBinds, unwrapValidated, proposalSubject, proposalReceiptSubject } from './validated-output.js';

export { Diagnostics } from './diagnostics.js';

export type { DiagnosticEvent, DiagnosticLevel, DiagnosticPayload, DiagnosticsSink } from './diagnostics.js';

export { AddressedDigest } from './addressed-digest.js';

export { fnv1a, fnv1aBytes } from './fnv.js';

export { editDistance, closestMatch } from './closest-match.js';

export { TypedRef } from './typed-ref.js';

export { BENCH_NOT_APPLICABLE_MARKER, BENCH_NOT_APPLICABLE_RE, benchNotApplicableMarker } from './bench-marker.js';

export { classifyBenchSource, benchHonestyError } from './bench-classify.js';
