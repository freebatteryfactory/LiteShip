/**
 * Compile-time laws for `02_targets/vite/05_build`.
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
import type { RevisionId } from '../../../00_core/02_identity/types.js';
import type { SourceRelation } from '../../../00_core/14_compiler/types.js';
import type { Assert, CaseOf, Equal, NonEmptyTuple } from '../../../types.js';
import type { ProducedArtifact } from '../../types.js';
import type { BuildProduct, FilledSlot } from './types.js';

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
