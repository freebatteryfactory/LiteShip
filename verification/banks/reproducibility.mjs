// One reproducibility grammar, instantiated per stage over a profile reference.
//
// The two types this replaced were both vacuous in their own way: the tool's
// determinism algebra had two empty arms, and the media one turned absent
// evidence into a negative finding. Every mutation here is a route back to one
// of those states.

import { runBank } from '../harness.mjs';

const EV = '00_core/06_evidence/types.ts';
const TL = '01_hosts/server/07_tool/types.ts';
const GX = '01_hosts/web/09_graphics/types.ts';
const CP = '01_hosts/web/12_capture/types.ts';

const M = [
  // --- the arms ------------------------------------------------------------
  ['the unclaimed arm acquires a witness', EV,
    `  unclaimed: { readonly limitations: NonEmptyTuple<Diagnostic> };`,
    `  unclaimed: {
    readonly limitations: NonEmptyTuple<Diagnostic>;
    readonly witness: ContentAddress<'application/vnd.liteship.reproducibility-witness+cbor'>;
  };`],

  ['the unclaimed arm acquires a profile', EV,
    `  unclaimed: { readonly limitations: NonEmptyTuple<Diagnostic> };`,
    `  unclaimed: { readonly limitations: NonEmptyTuple<Diagnostic>; readonly profile: Profile };`],

  ['the unclaimed arm goes silent about its limitations', EV,
    `  unclaimed: { readonly limitations: NonEmptyTuple<Diagnostic> };`,
    `  unclaimed: Record<never, never>;`],

  ['unclaimed limitations accept an empty population', EV,
    `  unclaimed: { readonly limitations: NonEmptyTuple<Diagnostic> };`,
    `  unclaimed: { readonly limitations: readonly Diagnostic[] };`],

  ['the reproducible arm drops its witness', EV,
    `  'reproducible-under-profile': {
    readonly profile: Profile;
    readonly witness: ContentAddress<'application/vnd.liteship.reproducibility-witness+cbor'>;
  };`,
    `  'reproducible-under-profile': {
    readonly profile: Profile;
  };`],

  ['the reproducible arm drops the profile it is reproducible under', EV,
    `  'reproducible-under-profile': {
    readonly profile: Profile;
    readonly witness: ContentAddress<'application/vnd.liteship.reproducibility-witness+cbor'>;
  };`,
    `  'reproducible-under-profile': {
    readonly witness: ContentAddress<'application/vnd.liteship.reproducibility-witness+cbor'>;
  };`],

  ['the observed-variable arm drops its evidence', EV,
    `  'observed-variable': {
    readonly profile: Profile;
    readonly evidence: ContentAddress<'application/vnd.liteship.reproducibility-variance+cbor'>;
  };`,
    `  'observed-variable': {
    readonly profile: Profile;
  };`],

  ['the grammar collapses back to a determinism boolean', EV,
    `export type ReproducibilityClaim<Profile> = Algebra<{
  unclaimed: { readonly limitations: NonEmptyTuple<Diagnostic> };`,
    `export type ReproducibilityClaim<Profile> = Algebra<{
  deterministic: { readonly profile: Profile };
  nondeterministic: Record<never, never>;
  unclaimed: { readonly limitations: NonEmptyTuple<Diagnostic> };`],

  ['a claim stops being exact over its profile', EV,
    `  'reproducible-under-profile': {
    readonly profile: Profile;
    readonly witness: ContentAddress<'application/vnd.liteship.reproducibility-witness+cbor'>;
  };
  'observed-variable': {
    readonly profile: Profile;
    readonly evidence: ContentAddress<'application/vnd.liteship.reproducibility-variance+cbor'>;
  };`,
    `  'reproducible-under-profile': {
    readonly profile: unknown;
    readonly witness: ContentAddress<'application/vnd.liteship.reproducibility-witness+cbor'>;
  };
  'observed-variable': {
    readonly profile: unknown;
    readonly evidence: ContentAddress<'application/vnd.liteship.reproducibility-variance+cbor'>;
  };`],

  // --- the observation and the cut -----------------------------------------
  ['an observation narrows to the ready state and forgets what failed', EV,
    `  readonly state: Evidence<ContentAddress>;
  readonly observedAt: TimeCoordinate;`,
    `  readonly state: { readonly value: ContentAddress };
  readonly observedAt: TimeCoordinate;`],

  ['an observation stops recording when it was observed', EV,
    `  readonly state: Evidence<ContentAddress>;
  readonly observedAt: TimeCoordinate;`,
    `  readonly state: Evidence<ContentAddress>;`],

  ['an evidence cut stops being exact over its identity', EV,
    `export interface EvidenceCut<Id extends EvidenceCutId = EvidenceCutId> {
  readonly id: EvidenceCutReference<Id>;`,
    `export interface EvidenceCut<Id extends EvidenceCutId = EvidenceCutId> {
  readonly id: EvidenceCutReference;`],

  ['an evidence cut stops being addressed', EV,
    `  readonly observations: readonly EvidenceObservation[];
  readonly address: ContentAddress<'application/vnd.liteship.evidence-cut+cbor'>;`,
    `  readonly observations: readonly EvidenceObservation[];`],

  // --- the tool profile ----------------------------------------------------
  ['the tool profile stops naming its executable bytes', TL,
    `  readonly version: ToolVersion;
  readonly executable: ContentAddress;`,
    `  readonly version: ToolVersion;`],

  ['the tool profile stops naming its configuration', TL,
    `  readonly options: ContentAddress<'application/vnd.liteship.server-tool-options+cbor'>;`,
    `  readonly options: CanonicalValue;`],

  ['the tool profile stops naming its environment', TL,
    `  readonly environment: ContentAddress<'application/vnd.liteship.server-tool-environment+cbor'>;
  readonly reproducibility: ReproducibilityClaim<ToolProfileReference<Profile>>;`,
    `  readonly reproducibility: ReproducibilityClaim<ToolProfileReference<Profile>>;`],

  ['the tool claim broadens off its own profile', TL,
    `  readonly reproducibility: ReproducibilityClaim<ToolProfileReference<Profile>>;`,
    `  readonly reproducibility: ReproducibilityClaim<ToolProfileReference>;`],

  ['the empty two-arm determinism algebra returns', TL,
    `  readonly reproducibility: ReproducibilityClaim<ToolProfileReference<Profile>>;`,
    `  readonly reproducibility: Algebra<{ deterministic: Record<never, never>; nondeterministic: Record<never, never> }>;`],

  // --- the raster and capture profiles -------------------------------------
  ['the raster profile collapses back into a context kind', GX,
    `  readonly context: GraphicsContextKind;
  readonly configuration: ContentAddress<'application/vnd.liteship.web-raster-profile+cbor'>;`,
    `  readonly context: GraphicsContextKind;`],

  ['the raster claim broadens off its own profile', GX,
    `  readonly reproducibility: ReproducibilityClaim<RasterProfileReference<Id>>;`,
    `  readonly reproducibility: ReproducibilityClaim<RasterProfileReference>;`],

  ['the capture profile claims determinism it cannot show', CP,
    `  readonly reproducibility: ReproducibilityClaim<CaptureProfileReference<Id>>;`,
    `  readonly reproducibility: ReproducibilityClaim<CaptureProfileReference>;`],
];

process.exit(runBank('reproducibility', M).clean ? 0 : 1);
