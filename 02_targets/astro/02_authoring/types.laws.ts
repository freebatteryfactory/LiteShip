/**
 * Compile-time laws for `02_targets/astro/02_authoring`.
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
import type { EvidenceProposition } from '../../../00_core/06_evidence/types.js';
import type { Assert, CaseOf, Equal, NonEmptyTuple } from '../../../types.js';
import type { AuthoredActivation, AuthoringOutcome, AuthoringRefusal } from './types.js';

// ---------------------------------------------------------------------------
// Laws

/**
 * Compile-time law: the activation proposition is core's, not a local twin.
 *
 * Compared against the imported authority itself. If this home ever declares
 * its own proposition algebra, the two stop being equal even when they are
 * structurally identical, because `Equal` is invariant.
 */
export type ActivationCarriesTheCoreProposition = Assert<
  Equal<AuthoredActivation['when'], EvidenceProposition>
>;


/**
 * Compile-time law: an authored directive selects no execution backend.
 *
 * The predecessor's `client:worker`, `client:gpu`, and `client:wasm` are each a
 * backend choice spelled as authoring syntax. Every one of these keys is absent
 * by law, so the nine spellings cannot reassemble here under one name.
 */
export type AnAuthoredDirectiveSelectsNoBackend = Assert<
  Equal<
    [
      'backend' extends keyof AuthoredActivation ? true : false,
      'worker' extends keyof AuthoredActivation ? true : false,
      'gpu' extends keyof AuthoredActivation ? true : false,
      'wasm' extends keyof AuthoredActivation ? true : false,
      'execution' extends keyof AuthoredActivation ? true : false,
      'runtime' extends keyof AuthoredActivation ? true : false,
    ],
    [false, false, false, false, false, false]
  >
>;


/**
 * Compile-time law: the activation directive is not a drawer.
 *
 * Island identity, graph-cut joining, evidence-source declaration, egress
 * selection, operation mounting, and target configuration each have an owner.
 * None of them is here. This is the law that stops one syntax-shaped kingdom
 * rising from the ashes of nine directives.
 */
export type TheActivationDirectiveHoldsNoForeignMeaning = Assert<
  Equal<
    [
      'island' extends keyof AuthoredActivation ? true : false,
      'join' extends keyof AuthoredActivation ? true : false,
      'source' extends keyof AuthoredActivation ? true : false,
      'egress' extends keyof AuthoredActivation ? true : false,
      'operation' extends keyof AuthoredActivation ? true : false,
      'configuration' extends keyof AuthoredActivation ? true : false,
      'payload' extends keyof AuthoredActivation ? true : false,
      'context' extends keyof AuthoredActivation ? true : false,
    ],
    [false, false, false, false, false, false, false, false]
  >
>;


/** Compile-time law: a refusal names what it refused and why. */
export type ARefusalNamesWhatItRefused = Assert<
  Equal<
    CaseOf<AuthoringRefusal, 'unknown-directive'>['diagnostics'],
    NonEmptyTuple<Diagnostic>
  >
>;


/** Compile-time law: translation and refusal stay distinct outcomes. */
export type TranslationAndRefusalStayDistinct = Assert<
  Equal<AuthoringOutcome['_tag'], 'translated' | 'refused'>
>;
