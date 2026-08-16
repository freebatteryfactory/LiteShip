/**
 * Compile-time laws for `00_core/08_state`.
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

import type { Address, Assert, Equal } from '../../types.js';
import type { ContentAddress } from '../01_encoding/types.js';
import type { RevisionReference, WorldId, WorldReference } from '../02_identity/types.js';
import type { EntityFieldReference } from '../03_schema/types.js';
import type { TimeCut } from '../04_time/types.js';
import type { EvidenceCutId, EvidenceCutReference } from '../06_evidence/types.js';
import type { AnySemanticCut, Commit, DraftSemanticCut, PatchPrecondition, SemanticCut } from './types.js';

type FieldAddressPrecondition = Extract<PatchPrecondition, { readonly _tag: 'field-address-is' }>;


/** Compile-time law: field preconditions bind one entity and one schema-derived field. */
export type FieldAddressPreconditionBindsEntityAndField = Assert<
  Equal<FieldAddressPrecondition extends EntityFieldReference ? true : false, true>
>;


// ---------------------------------------------------------------------------
// Cut laws
// ---------------------------------------------------------------------------

type CutLawWorldA = WorldId<'liteship.law.world-a'>;

type CutLawWorldB = WorldId<'liteship.law.world-b'>;

// `RevisionId` is a content address, not a branded name, so the revision axis is
// carried by literal address specimens exactly as `02_identity` carries its own.
type CutLawRevisionA = Address<
  'liteship.content:application/vnd.liteship.revision+cbor',
  'sha256:3333333333333333333333333333333333333333333333333333333333333333'
>;

type CutLawRevisionB = Address<
  'liteship.content:application/vnd.liteship.revision+cbor',
  'sha256:4444444444444444444444444444444444444444444444444444444444444444'
>;

type CutLawEvidenceA = EvidenceCutId<'liteship.law.evidence-a'>;

type CutLawEvidenceB = EvidenceCutId<'liteship.law.evidence-b'>;


type CutLawA = SemanticCut<CutLawWorldA, CutLawRevisionA, CutLawEvidenceA>;


/**
 * Compile-time law: the cut names all four axes and is addressed.
 *
 * Members are named one at a time. A whole-shape comparison stays green while
 * an individual member blurs to `unknown`, and the member most likely to be
 * quietly dropped is the world — a revision reference does not identify the
 * world it belongs to, so a cut carrying revision alone would look complete and
 * mean less than it claims.
 */
export type ASemanticCutNamesWorldRevisionTimeAndEvidence = Assert<
  Equal<
    [
      CutLawA['world'],
      CutLawA['revision'],
      CutLawA['evidence'],
      CutLawA['time'] extends TimeCut ? true : false,
      CutLawA['address'],
    ],
    [
      WorldReference<CutLawWorldA>,
      RevisionReference<CutLawRevisionA>,
      EvidenceCutReference<CutLawEvidenceA>,
      true,
      ContentAddress<'application/vnd.liteship.semantic-cut+cbor'>,
    ]
  >
>;


/**
 * Compile-time law: the cut is exact on every axis independently.
 *
 * Each axis is varied alone, because a law that varies them together stays
 * green when exactly one parameter stops being load-bearing.
 */
export type ASemanticCutIsExactOnEveryAxis = Assert<
  Equal<
    [
      CutLawA extends SemanticCut<CutLawWorldB, CutLawRevisionA, CutLawEvidenceA> ? true : false,
      CutLawA extends SemanticCut<CutLawWorldA, CutLawRevisionB, CutLawEvidenceA> ? true : false,
      CutLawA extends SemanticCut<CutLawWorldA, CutLawRevisionA, CutLawEvidenceB> ? true : false,
      CutLawA extends SemanticCut<CutLawWorldA, CutLawRevisionA, CutLawEvidenceA> ? true : false,
      CutLawA extends SemanticCut ? true : false,
    ],
    [false, false, false, true, true]
  >
>;


/**
 * Compile-time law: a draft cut cannot satisfy a committed cut, in either
 * direction, at the same instantiation.
 *
 * The two forms differ by one reference kind. That is enough, and this law
 * exists because it is exactly the kind of distinction that survives review as
 * a comment and dies silently in the types.
 */
export type ADraftCutCannotSatisfyACommittedCut = Assert<
  Equal<
    [
      DraftSemanticCut<CutLawWorldA, CutLawRevisionA, CutLawEvidenceA> extends CutLawA ? true : false,
      CutLawA extends DraftSemanticCut<CutLawWorldA, CutLawRevisionA, CutLawEvidenceA> ? true : false,
      CutLawA extends AnySemanticCut<CutLawWorldA, CutLawRevisionA, CutLawEvidenceA> ? true : false,
      DraftSemanticCut<CutLawWorldA, CutLawRevisionA, CutLawEvidenceA> extends AnySemanticCut<
        CutLawWorldA,
        CutLawRevisionA,
        CutLawEvidenceA
      >
        ? true
        : false,
    ],
    [false, false, true, true]
  >
>;


/** Compile-time law: a commit carries the exact cut it answers for. */
export type ACommitCarriesItsExactCut = Assert<
  Equal<
    [
      Commit<CutLawA>['cut'],
      Commit<CutLawA> extends Commit<SemanticCut<CutLawWorldB, CutLawRevisionA, CutLawEvidenceA>>
        ? true
        : false,
    ],
    [CutLawA, false]
  >
>;
