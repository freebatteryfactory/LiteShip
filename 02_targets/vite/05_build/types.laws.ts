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
  Equal<FilledSlot['produced'], ProducedArtifact>
>;


/**
 * Compile-time law: source-map disposition is core's source relation.
 *
 * Stated rather than defaulted, and written against the imported authority so a
 * local optional map field cannot take its place.
 */
export type SourceMapDispositionIsStated = Assert<
  Equal<CaseOf<BuildProduct, 'built'>['maps'], SourceRelation<RevisionId>>
>;


/** Compile-time law: a failed build carries a non-empty diagnosis. */
export type AFailedBuildExplainsItself = Assert<
  Equal<
    [
      Equal<BuildProduct['_tag'], 'built' | 'refused' | 'failed'>,
      Equal<CaseOf<BuildProduct, 'failed'>['diagnostics'], NonEmptyTuple<Diagnostic>>,
    ],
    [true, true]
  >
>;
