/**
 * Final build products: chunks, emitted rosters, and the manifest — with one
 * producer per slot.
 *
 * The predecessor wrote its boundary manifest twice, from two different
 * derivations, in two different packages: once at bundle generation and once
 * from a fresh rescan at the end of the framework build. Nothing recorded which
 * one won. The ecosystem does not arbitrate this — both derivation surfaces
 * exist and neither has a concept of a winner.
 *
 * The umbrella already made the answer unrepresentable: a `ProducedArtifact`
 * carries one producer and one slot. This home consumes that rather than
 * inventing a second manifest vocabulary, so a second emitter has no shape to
 * take.
 *
 * Source-map disposition is stated, not defaulted. Under Rolldown, returning a
 * null map asserts that a transformation preserved coordinates; a transform
 * that moved code and said that was making a false claim, not skipping an
 * optional feature.
 *
 * @module
 */

import type {
  Algebra,
  Assert,
  Brand,
  CaseOf,
  Equal,
  NonEmptyTuple,
} from '../../../types.js';
import type { RevisionId } from '../../../00_core/02_identity/types.js';
import type { SourceRelation } from '../../../00_core/14_compiler/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type {
  ArtifactSlotReference,
  ProducedArtifact,
} from '../../types.js';
import type { BuildEnvironmentName } from '../00_integration/types.js';
import type { GeneratedAsset } from '../04_asset/types.js';

/** One emitted chunk name. An ecosystem location handle. */
export type ChunkName = Brand<string, 'liteship.target.vite.chunk-name'>;

/**
 * One chunk and what it pulled in.
 *
 * Ancestry comes from the bundler's own per-chunk metadata rather than from a
 * separately maintained manifest, so there is one derivation rather than two.
 */
export interface EmittedChunk {
  readonly name: ChunkName;
  readonly environment: BuildEnvironmentName;
  readonly importedCss: readonly ChunkName[];
  readonly importedAssets: readonly ChunkName[];
}

/**
 * One filled slot: exactly one produced artifact, which carries exactly one
 * producer.
 *
 * There is no roster of candidate emitters and no merge step. Two producers for
 * one slot is not an error condition here — it has no representation.
 */
export interface FilledSlot {
  readonly slot: ArtifactSlotReference;
  readonly produced: ProducedArtifact;
}

/**
 * What a build produced.
 *
 * `refused` declined before producing anything; `failed` broke while producing.
 * Both carry diagnostics and nothing else — the tag is the whole distinction,
 * because compatibility evidence belongs to `00_integration` and restating it
 * here would be a second copy of a fact that already has an owner.
 *
 * Neither carries slots, so a broken build cannot present a partial roster as a
 * result.
 */
export type BuildProduct<Revision extends RevisionId = RevisionId> = Algebra<{
  built: {
    readonly chunks: readonly EmittedChunk[];
    readonly slots: readonly FilledSlot[];
    readonly assets: readonly GeneratedAsset<Revision>[];
    readonly maps: SourceRelation<Revision>;
  };
  refused: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  failed: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

// ---------------------------------------------------------------------------
// Laws

/**
 * Compile-time law: one slot receives one produced artifact.
 *
 * Singular by type. A tuple, array, or set of producers here would be the
 * predecessor's two-emitter shape with better naming.
 */
export type OneSlotReceivesOneProducer = Assert<
  Equal<
    [
      Equal<FilledSlot['produced'], ProducedArtifact>,
      'producers' extends keyof FilledSlot ? true : false,
      'candidates' extends keyof FilledSlot ? true : false,
      'emitters' extends keyof FilledSlot ? true : false,
    ],
    [true, false, false, false]
  >
>;

/**
 * Compile-time law: the build carries no second manifest vocabulary.
 *
 * Ancestry is on the produced artifact and on per-chunk metadata. A `manifest`
 * member here would be a third derivation of facts that already have an owner.
 */
export type TheBuildCarriesNoSecondManifest = Assert<
  Equal<
    [
      'manifest' extends keyof CaseOf<BuildProduct, 'built'> ? true : false,
      'boundaries' extends keyof CaseOf<BuildProduct, 'built'> ? true : false,
    ],
    [false, false]
  >
>;

/**
 * Compile-time law: source-map disposition is core's source relation.
 *
 * Stated rather than defaulted, and written against the imported authority so a
 * local optional map field cannot take its place.
 */
export type SourceMapDispositionIsStated = Assert<
  Equal<
    [
      Equal<CaseOf<BuildProduct, 'built'>['maps'], SourceRelation<RevisionId>>,
      'sourceMap' extends keyof CaseOf<BuildProduct, 'built'> ? true : false,
      'map' extends keyof CaseOf<BuildProduct, 'built'> ? true : false,
    ],
    [true, false, false]
  >
>;

/** Compile-time law: a refused or failed build reports no slots. */
export type ABrokenBuildReportsNoSlots = Assert<
  Equal<
    [
      Equal<BuildProduct['_tag'], 'built' | 'refused' | 'failed'>,
      'slots' extends keyof CaseOf<BuildProduct, 'refused'> ? true : false,
      'slots' extends keyof CaseOf<BuildProduct, 'failed'> ? true : false,
      Equal<CaseOf<BuildProduct, 'failed'>['diagnostics'], NonEmptyTuple<Diagnostic>>,
    ],
    [true, false, false, true]
  >
>;

/** The families this home owns, so none is correct and unreached. */
export interface ViteBuildTypeSurface {
  readonly chunk: EmittedChunk;
  readonly filled: FilledSlot;
  readonly product: BuildProduct;
}
