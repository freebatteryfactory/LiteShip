/**
 * Final build products: chunks, emitted rosters, and the manifest — with one
 * producer per slot.
 *
 * Two independently derived boundary manifests could disagree with no recorded
 * winner. The ecosystem exposes both derivation surfaces and does not arbitrate
 * between them.
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
  Brand,
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

/** The families this home owns, so none is correct and unreached. */
export interface ViteBuildTypeSurface {
  readonly chunk: EmittedChunk;
  readonly filled: FilledSlot;
  readonly product: BuildProduct;
}
