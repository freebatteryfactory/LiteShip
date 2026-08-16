/**
 * Compile-time laws for `02_targets/vite/04_asset`.
 *
 * A law is a fixture about the specification, not part of it. Root states the
 * reason and this file applies it: a fixture living in a declaration file
 * becomes part of that file's addressed public type surface, so the proofs live
 * beside the declarations they constrain rather than inside them.
 *
 * Nothing imports this file. It emits no JavaScript and exports no value.
 *
 * @module
 */

import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { RevisionId } from '../../../00_core/02_identity/types.js';
import type { SourceRelation } from '../../../00_core/14_compiler/types.js';
import type { Assert, CaseOf, Equal, NonEmptyTuple } from '../../../types.js';
import type { ProducedArtifact } from '../../types.js';
import type { GeneratedModuleIdentity } from '../02_module/types.js';
import type { AssetDisclosure, AssetEmission, EmittedReferenceId, GeneratedAsset } from './types.js';

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
 * `entry` is a real generated module identity, so the generated asset remains
 * attached to the module graph.
 */
export type AGeneratedAssetStaysInTheGraph = Assert<
  Equal<GeneratedAsset['entry'], GeneratedModuleIdentity>
>;


/**
 * Compile-time law: an asset that could not resolve its ancestry is
 * distinguishable from one that legitimately resolved to nothing.
 *
 * This is the requirement the predecessor's matrix never had. `emitted` carries
 * an asset with ancestry; `unresolved-ancestry` carries diagnostics and no
 * asset at all.
 */
export type UnresolvedAncestryIsDiagnosed = Assert<
  Equal<
    [
      Equal<AssetEmission['_tag'], 'emitted' | 'unresolved-ancestry' | 'failed'>,
      Equal<CaseOf<AssetEmission, 'unresolved-ancestry'>['diagnostics'], NonEmptyTuple<Diagnostic>>,
    ],
    [true, true]
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
