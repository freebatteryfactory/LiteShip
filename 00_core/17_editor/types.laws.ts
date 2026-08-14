/**
 * Compile-time laws for `00_core/17_editor`.
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

import type { Assert, Equal } from '../../types.js';
import type { DraftRevisionReference, RevisionReference } from '../02_identity/types.js';
import type { DraftSemanticCut, SemanticCut } from '../08_state/types.js';
import type { PreviewBranch, WorkingOverlay } from './types.js';

/**
 * Compile-time law: preview reaches a draft cut, and cannot quietly hand back a
 * committed one.
 *
 * The editor is the one place where a draft becoming indistinguishable from a
 * commit is a one-member change, so the distinction is checked rather than
 * described.
 */
export type APreviewProducesADraftCut = Assert<
  Equal<
    [
      PreviewBranch['result'] extends DraftSemanticCut ? true : false,
      PreviewBranch['result'] extends SemanticCut ? true : false,
      'base' extends keyof PreviewBranch ? true : false,
      'time' extends keyof WorkingOverlay ? true : false,
    ],
    [true, false, false, false]
  >
>;


/** Compile-time law: preview results cannot satisfy committed revision references. */
export type EditorDraftIsNotCommitted = Assert<
  Equal<DraftRevisionReference extends RevisionReference ? true : false, false>
>;
