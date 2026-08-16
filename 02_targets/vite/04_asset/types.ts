/**
 * Worker, WebAssembly, and binary emission — inside the module graph, with
 * ancestry.
 *
 * A worker assembled from source strings has no canonical module, digest,
 * source-map relation, or producer identity, so it cannot be explained or
 * reproduced.
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
  Brand,
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

/** The families this home owns, so none is correct and unreached. */
export interface ViteAssetTypeSurface {
  readonly reference: EmittedReferenceId;
  readonly kind: GeneratedAssetKind;
  readonly disclosure: AssetDisclosure;
  readonly asset: GeneratedAsset;
  readonly emission: AssetEmission;
}
