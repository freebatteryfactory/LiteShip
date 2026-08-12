// The Vite target child.
//
// Most of these restore a defect the predecessor actually shipped: seven fixed
// virtual-module ids that made two projects one identity, a manifest written
// twice from two derivations with no record of which won, hot updates with no
// monotonic order, a worker launched from an interpolated Blob URL with no
// digest, and a virtual module that answered "missing data" with an empty
// object. They are regression tests for history, not hypotheticals.
//
// The rest guard the seam: a projection that stops being derived from the
// fleet, an applicability that widens to every environment, and an emitted
// reference id promoted to artifact identity.

import { runBank } from '../harness.mjs';

const I = '02_targets/vite/00_integration/types.ts';
const P = '02_targets/vite/01_projection/types.ts';
const M_ = '02_targets/vite/02_module/types.ts';
const G = '02_targets/vite/03_graph/types.ts';
const A = '02_targets/vite/04_asset/types.ts';
const B = '02_targets/vite/05_build/types.ts';

const M = [
  // --- identity and environment scope ---------------------------------------
  ['the vite target identity broadens', I,
    `export type ViteTargetId = EcosystemTargetId<'vite'>;`,
    `export type ViteTargetId = EcosystemTargetId;`],

  ['the plugin adopts a foreign ecosystem target', I,
    `export type ViteTargetId = EcosystemTargetId<'vite'>;`,
    `export type ViteTargetId = EcosystemTargetId<'astro'>;`],

  ['environment applicability widens to every environment', I,
    `export type EnvironmentApplicability = NonEmptyTuple<BuildEnvironmentName>;`,
    `export type EnvironmentApplicability = readonly BuildEnvironmentName[];`],

  ['the definition stops declaring where it applies', I,
    `  readonly environments: EnvironmentApplicability;`,
    `  readonly environments?: EnvironmentApplicability;`],

  ['the definition decorrelates its configuration revision', I,
    `  readonly participation: TargetParticipation<ViteTargetId, Config, Revision>;`,
    `  readonly participation: TargetParticipation;`],

  ['vite compatibility loses the unavailable altitude', I,
    `  unavailable: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;`,
    `}>;`],

  ['an unavailable vite claim acquires evidence', I,
    `  unavailable: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;`,
    `  unavailable: { readonly evidence: ViteCompatibilityEvidence; readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;`],

  // --- fleet projection -----------------------------------------------------
  ['the fleet projection becomes a hand-authored roster', P,
    `export type FleetProjection<Fleet extends readonly CompilerId[]> = {
  readonly [Index in keyof Fleet]: ArmProjection;
};`,
    `export type FleetProjection<Fleet extends readonly CompilerId[]> = readonly [ArmProjection];`],

  ['the fleet projection stops reading the fleet', P,
    `export type FleetProjection<Fleet extends readonly CompilerId[]> = {
  readonly [Index in keyof Fleet]: ArmProjection;
};`,
    `export type FleetProjection<Fleet extends readonly CompilerId[]> = readonly ArmProjection[];`],

  ['an unsupported arm becomes a silent no-op', P,
    `  unsupported: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

/**
 * The fleet projection`,
    `  unsupported: Record<never, never>;
}>;

/**
 * The fleet projection`],

  ['a projected arm stops declaring its environments', P,
    `  projected: { readonly environments: NonEmptyTuple<BuildEnvironmentName> };`,
    `  projected: { readonly environments: readonly BuildEnvironmentName[] };`],

  ['the vite facility widens its participation', P,
    `  readonly participation: Participation;
  readonly slots: Demands;`,
    `  readonly participation: TargetParticipation;
  readonly slots: Demands;`],

  ['the vite facility widens its slots', P,
    `  readonly participation: Participation;
  readonly slots: Demands;`,
    `  readonly participation: Participation;
  readonly slots: ViteSlotDemands;`],

  ['the vite facility names its requester', P,
    `  readonly claims: NonEmptyTuple<SlotClaim>;
  readonly project: Signature<`,
    `  readonly claims: NonEmptyTuple<SlotClaim>;
  readonly astro: unknown;
  readonly project: Signature<`],

  ['the vite disposition loses the unresolved altitude', P,
    `  unresolved: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  failed: { readonly diagnostics: NonEmptyTuple<Diagnostic> };`,
    `  failed: { readonly diagnostics: NonEmptyTuple<Diagnostic> };`],

  ['an empty vite disposition acquires production', P,
    `  empty: Record<never, never>;`,
    `  empty: { readonly produced: readonly ProducedArtifact[] };`],

  // --- module identity ------------------------------------------------------
  ['virtual module identity ignores the target configuration', M_,
    `  readonly configuration: TargetConfigurationRevision<Config, Revision>;
  readonly source: RevisionReference<Revision>;`,
    `  readonly source: RevisionReference<Revision>;`],

  ['virtual module identity decorrelates its configuration', M_,
    `  readonly configuration: TargetConfigurationRevision<Config, Revision>;
  readonly source: RevisionReference<Revision>;`,
    `  readonly configuration: TargetConfigurationRevision;
  readonly source: RevisionReference<Revision>;`],

  ['virtual module identity ignores the source revision', M_,
    `  readonly source: RevisionReference<Revision>;
  readonly environment: BuildEnvironmentName;`,
    `  readonly environment: BuildEnvironmentName;`],

  ['virtual module identity ignores the environment', M_,
    `  readonly source: RevisionReference<Revision>;
  readonly environment: BuildEnvironmentName;`,
    `  readonly source: RevisionReference<Revision>;`],

  ['the public specifier becomes the semantic identity', M_,
    `export type ModuleSpecifier = Brand<string, 'liteship.target.vite.module-specifier'>;`,
    `export type ModuleSpecifier = GeneratedModuleIdentity;`],

  ['unresolved module data becomes a valid empty output', M_,
    `  unresolved: { readonly diagnostics: NonEmptyTuple<Diagnostic> };`,
    `  unresolved: { readonly identity: GeneratedModuleIdentity<Config, Revision> };`],

  ['empty and unresolved collapse into one answer', M_,
    `  'genuinely-empty': { readonly identity: GeneratedModuleIdentity<Config, Revision> };
  unresolved: { readonly diagnostics: NonEmptyTuple<Diagnostic> };`,
    `  unresolved: { readonly diagnostics: NonEmptyTuple<Diagnostic> };`],

  ['a resolved location becomes an identity', M_,
    `export type ResolvedModuleLocation = Brand<string, 'liteship.target.vite.resolved-location'>;`,
    `export type ResolvedModuleLocation = GeneratedModuleIdentity;`],

  // --- graph and hot updates -------------------------------------------------
  ['a hot update loses its source revision', G,
    `  readonly source: RevisionReference<Revision>;
  readonly configuration: TargetConfigurationRevision<Config, Revision>;`,
    `  readonly configuration: TargetConfigurationRevision<Config, Revision>;`],

  ['a hot update loses its configuration revision', G,
    `  readonly source: RevisionReference<Revision>;
  readonly configuration: TargetConfigurationRevision<Config, Revision>;`,
    `  readonly source: RevisionReference<Revision>;`],

  ['a hot update loses its environment', G,
    `  readonly environment: BuildEnvironmentName;
  readonly sequence: StreamSequence;`,
    `  readonly sequence: StreamSequence;`],

  ['a hot update loses its ordering coordinate', G,
    `  readonly environment: BuildEnvironmentName;
  readonly sequence: StreamSequence;`,
    `  readonly environment: BuildEnvironmentName;`],

  ['the ecosystem timestamp is promoted to the ordering coordinate', G,
    `  readonly sequence: StreamSequence;
}`,
    `  readonly sequence: StreamSequence;
  readonly timestamp: number;
}`],

  ['a stale hot update is accepted', G,
    `  stale: {
    readonly offered: StreamSequence;
    readonly current: StreamSequence;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };`,
    `  stale: {
    readonly offered: StreamSequence;
    readonly current: StreamSequence;
    readonly update: HotUpdate<Config, Revision>;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };`],

  ['a stale rejection stops saying what beat it', G,
    `    readonly current: StreamSequence;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;`,
    `    readonly current: number;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;`],

  // --- assets ----------------------------------------------------------------
  ['an emitted reference id becomes artifact identity', A,
    `export type EmittedReferenceId = Brand<string, 'liteship.target.vite.emitted-reference-id'>;`,
    `export type EmittedReferenceId = ContentAddress;`],

  ['a worker entry becomes an interpolated source string', A,
    `  readonly entry: GeneratedModuleIdentity;`,
    `  readonly entry: GeneratedModuleIdentity;
  readonly code: string;`],

  ['a worker entry bypasses the canonical bootstrap', A,
    `  readonly entry: GeneratedModuleIdentity;`,
    `  readonly entry: GeneratedModuleIdentity;
  readonly url: string;`],

  ['a generated asset loses its source relation', A,
    `  readonly relation: SourceRelation<Revision>;`,
    `  readonly relation?: SourceRelation<Revision>;`],

  ['a generated asset loses its ancestry', A,
    `  readonly ancestry: ProducedArtifact;`,
    `  readonly ancestry?: ProducedArtifact;`],

  ['unresolved ancestry becomes an emitted asset', A,
    `  'unresolved-ancestry': { readonly diagnostics: NonEmptyTuple<Diagnostic> };`,
    `  'unresolved-ancestry': { readonly asset: GeneratedAsset<Revision> };`],

  ['asset disclosure widens to any string', A,
    `export type AssetDisclosure = 'browser' | 'server-only';`,
    `export type AssetDisclosure = string;`],

  // --- build products ---------------------------------------------------------
  ['a second manifest producer appears', B,
    `  built: {
    readonly chunks: readonly EmittedChunk[];`,
    `  built: {
    readonly manifest: unknown;
    readonly chunks: readonly EmittedChunk[];`],

  ['one slot admits several producers', B,
    `  readonly produced: ProducedArtifact;
}`,
    `  readonly produced: ProducedArtifact;
  readonly producers: readonly ProducedArtifact[];
}`],

  ['a filled slot loses its produced artifact', B,
    `  readonly slot: ArtifactSlotReference;
  readonly produced: ProducedArtifact;`,
    `  readonly slot: ArtifactSlotReference;
  readonly produced: ArtifactSlotReference;`],

  ['the build reverts to an optional source map', B,
    `    readonly maps: SourceRelation<Revision>;`,
    `    readonly maps: SourceRelation<Revision>;
    readonly sourceMap?: unknown;`],

  ['a failed build still reports slots', B,
    `  failed: { readonly diagnostics: NonEmptyTuple<Diagnostic> };`,
    `  failed: { readonly slots: readonly FilledSlot[]; readonly diagnostics: NonEmptyTuple<Diagnostic> };`],

  ['a failed build stops explaining itself', B,
    `  failed: { readonly diagnostics: NonEmptyTuple<Diagnostic> };`,
    `  failed: { readonly diagnostics: readonly Diagnostic[] };`],
];

process.exit(runBank('vite', M).clean ? 0 : 1);
