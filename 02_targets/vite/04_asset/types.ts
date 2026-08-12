/**
 * Worker, WebAssembly, and binary emission — inside the module graph, with
 * ancestry.
 *
 * The predecessor launched its compositor worker from a Blob URL assembled by
 * interpolating three source strings: no banner, no version, no digest, no
 * source-map link, and five independent startup strings with no canonical
 * bootstrap. Nothing about that worker was addressable, so nothing about it was
 * explicable.
 *
 * The ecosystem already solves this. Vite gives a bundler-owned worker entry —
 * a real module with a content-hashed filename, source maps, and its own
 * configuration — so a synthesized worker body belongs in the graph as a
 * generated module consumed through that entry, not in a string.
 *
 * What the ecosystem does not give is identity. `emitFile` returns a reference
 * id and `getFileName` resolves it to a filename; both are ecosystem location
 * handles, and neither is a content address or a record of who produced what.
 * That distinction is this home's, and the laws below hold it.
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
import type { ContentAddress, ContentDigest } from '../../../00_core/01_encoding/types.js';
import type { RevisionId } from '../../../00_core/02_identity/types.js';
import type { SourceRelation } from '../../../00_core/14_compiler/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { ProducedArtifact } from '../../types.js';
import type { GeneratedModuleIdentity } from '../02_module/types.js';

/** The handle the bundler returns from an emit. A location, not an identity. */
export type EmittedReferenceId = Brand<string, 'liteship.target.vite.emitted-reference-id'>;

/** What kind of generated asset this is. */
export type GeneratedAssetKind = 'worker' | 'wasm' | 'binary';

/** Whether an asset's bytes may be read by a browser. */
export type AssetDisclosure = 'browser' | 'server-only';

/**
 * One generated asset, addressed and explicable.
 *
 * `entry` keeps it in the module graph. `relation` is core's source relation,
 * so an asset that cannot be mapped must say so as a first-class arm rather
 * than by returning a null map — which under Rolldown semantics asserts that
 * coordinates were preserved, and is a lie whenever code moved.
 */
export interface GeneratedAsset<Revision extends RevisionId = RevisionId> {
  readonly kind: GeneratedAssetKind;
  readonly entry: GeneratedModuleIdentity;
  readonly reference: EmittedReferenceId;
  readonly address: ContentAddress;
  readonly digest: ContentDigest;
  readonly relation: SourceRelation<Revision>;
  readonly disclosure: AssetDisclosure;
  readonly ancestry: ProducedArtifact;
}

/** What emitting an asset yielded. */
export type AssetEmission<Revision extends RevisionId = RevisionId> = Algebra<{
  emitted: { readonly asset: GeneratedAsset<Revision> };
  'unresolved-ancestry': { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  failed: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

// ---------------------------------------------------------------------------
// Laws

/**
 * Compile-time law: a bundler reference id is not artifact identity.
 *
 * Both directions, and against the produced artifact too. If a reference id
 * could stand in for either, the bundler's bookkeeping would silently become
 * the architecture's ancestry.
 */
export type AReferenceIdIsNotArtifactIdentity = Assert<
  Equal<
    [
      EmittedReferenceId extends ContentAddress ? true : false,
      ContentAddress extends EmittedReferenceId ? true : false,
      EmittedReferenceId extends ProducedArtifact ? true : false,
    ],
    [false, false, false]
  >
>;

/**
 * Compile-time law: a generated asset carries core's source relation.
 *
 * Written against the imported authority. The `deliberately-unmappable` arm is
 * what a transform reaches for when it genuinely cannot map — the honest form
 * of what the predecessor spelled as a null map.
 */
export type AGeneratedAssetCarriesTheCoreSourceRelation = Assert<
  Equal<GeneratedAsset['relation'], SourceRelation<RevisionId>>
>;

/**
 * Compile-time law: a generated asset stays in the module graph.
 *
 * `entry` is a real generated module identity, so a worker assembled from
 * interpolated strings has nowhere to live. There is no `code`, no `source`,
 * and no `url` member for one to hide in.
 */
export type AGeneratedAssetStaysInTheGraph = Assert<
  Equal<
    [
      Equal<GeneratedAsset['entry'], GeneratedModuleIdentity>,
      'code' extends keyof GeneratedAsset ? true : false,
      'source' extends keyof GeneratedAsset ? true : false,
      'url' extends keyof GeneratedAsset ? true : false,
      'blob' extends keyof GeneratedAsset ? true : false,
    ],
    [true, false, false, false, false]
  >
>;

/**
 * Compile-time law: an asset that could not resolve its ancestry is
 * distinguishable from one that legitimately resolved to nothing.
 *
 * This is the requirement the predecessor's matrix never had. `emitted` carries
 * an asset with ancestry; `unresolved-ancestry` carries diagnostics and no
 * asset at all.
 */
export type UnresolvedAncestryIsNotAnAsset = Assert<
  Equal<
    [
      Equal<AssetEmission['_tag'], 'emitted' | 'unresolved-ancestry' | 'failed'>,
      'asset' extends keyof CaseOf<AssetEmission, 'unresolved-ancestry'> ? true : false,
      Equal<CaseOf<AssetEmission, 'unresolved-ancestry'>['diagnostics'], NonEmptyTuple<Diagnostic>>,
    ],
    [true, false, true]
  >
>;

/**
 * Compile-time law: ancestry and the source relation are required members.
 *
 * Optionality is the escape this catches. Under
 * `exactOptionalPropertyTypes` an optional member widens to include
 * `undefined`, so an asset could be emitted with no recorded origin at all and
 * every other law here would still pass.
 */
export type AncestryAndRelationAreNotOptional = Assert<
  Equal<
    [
      Equal<GeneratedAsset['ancestry'], ProducedArtifact>,
      Equal<GeneratedAsset['relation'], SourceRelation<RevisionId>>,
      undefined extends GeneratedAsset['ancestry'] ? true : false,
    ],
    [true, true, false]
  >
>;

/**
 * Compile-time law: disclosure is carried, not inferred.
 *
 * A server-only asset must not be assignable where a browser asset is
 * expected. The exactness lives on the union member, so this fails the moment
 * the classification becomes a single widened string.
 */
export type DisclosureIsCarriedNotInferred = Assert<
  Equal<
    [
      Equal<GeneratedAsset['disclosure'], AssetDisclosure>,
      string extends GeneratedAsset['disclosure'] ? true : false,
    ],
    [true, false]
  >
>;

/** The families this home owns, so none is correct and unreached. */
export interface ViteAssetTypeSurface {
  readonly reference: EmittedReferenceId;
  readonly kind: GeneratedAssetKind;
  readonly disclosure: AssetDisclosure;
  readonly asset: GeneratedAsset;
  readonly emission: AssetEmission;
}
