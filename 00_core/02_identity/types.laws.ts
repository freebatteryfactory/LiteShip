/**
 * Compile-time laws for `00_core/02_identity`.
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
import type { DraftRevisionReference, RevisionReference } from './types.js';

/** Two distinct committed revisions, written as literal carriers. */
type CommittedRevisionLawA = Address<
  'liteship.content:application/vnd.liteship.revision+cbor',
  'sha256:1111111111111111111111111111111111111111111111111111111111111111'
>;

type CommittedRevisionLawB = Address<
  'liteship.content:application/vnd.liteship.revision+cbor',
  'sha256:2222222222222222222222222222222222222222222222222222222222222222'
>;


/**
 * Compile-time law: a revision reference is exact over the revision it names,
 * and two exact revisions are not interchangeable.
 *
 * The specimens are literal carriers rather than the alias compared against its
 * own declaration. That version passes with the type parameter deleted, which
 * is the only thing this law exists to catch.
 */
export type ARevisionReferenceIsExactOverItsRevision = Assert<
  Equal<
    [
      RevisionReference<CommittedRevisionLawA> extends RevisionReference<CommittedRevisionLawB> ? true : false,
      RevisionReference<CommittedRevisionLawA> extends RevisionReference<CommittedRevisionLawA> ? true : false,
      RevisionReference<CommittedRevisionLawA> extends RevisionReference ? true : false,
    ],
    [false, true, true]
  >
>;


/**
 * Compile-time law: a draft reference is exact over the candidate revision it
 * names, exactly as the committed reference is over its own.
 *
 * Written against literal carriers rather than the alias compared with itself,
 * because the self-comparison passes with the type parameter deleted — which is
 * the whole of what this law exists to catch.
 */
export type ADraftRevisionReferenceIsExactOverItsRevision = Assert<
  Equal<
    [
      DraftRevisionReference<CommittedRevisionLawA> extends DraftRevisionReference<CommittedRevisionLawB>
        ? true
        : false,
      DraftRevisionReference<CommittedRevisionLawA> extends DraftRevisionReference<CommittedRevisionLawA>
        ? true
        : false,
      DraftRevisionReference<CommittedRevisionLawA> extends DraftRevisionReference ? true : false,
    ],
    [false, true, true]
  >
>;


/**
 * Compile-time law: a draft reference cannot satisfy a committed revision
 * reference, and genericity does not open a door in either direction.
 *
 * The exact instantiations are checked beside the broad forms. Making the draft
 * reference generic is precisely the kind of change that could have made one
 * assignable to the other at some instantiation while the broad comparison went
 * on reporting a clean separation.
 */
export type DraftRevisionIsNotCommitted = Assert<
  Equal<
    [
      DraftRevisionReference extends RevisionReference ? true : false,
      RevisionReference extends DraftRevisionReference ? true : false,
      DraftRevisionReference<CommittedRevisionLawA> extends RevisionReference<CommittedRevisionLawA>
        ? true
        : false,
      RevisionReference<CommittedRevisionLawA> extends DraftRevisionReference<CommittedRevisionLawA>
        ? true
        : false,
    ],
    [false, false, false, false]
  >
>;
