/**
 * Translation from what an author writes in Astro into meaning that already
 * exists upstream.
 *
 * This home owns one relationship: an authored activation directive carries an
 * evidence proposition. The proposition is core's `EvidenceProposition`, not a
 * local condition algebra — a target that authors its own proposition grammar
 * has stopped translating and started competing.
 *
 * The predecessor registered nine client directives that mixed several
 * unrelated categories: adaptivity, graph-cut joining, remote evidence sources,
 * and backend selection. Three of those nine (`worker`, `gpu`, `wasm`) let an
 * author pick an execution backend through a hydration spelling. The compiler
 * and the backend planner choose backends from requirements and evidence. An
 * author directive is not a backend dropdown wearing HTML.
 *
 * Collapsing nine spellings into one must not produce one drawer holding all
 * nine meanings. The absence laws below are what keep this from becoming a
 * payload bag with a nicer name.
 *
 * @module
 */

import type { Algebra, Assert, Brand, CaseOf, Equal, NonEmptyTuple } from '../../../types.js';
import type { EvidenceProposition } from '../../../00_core/06_evidence/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';

/** The spelling an author writes. Ecosystem surface, not semantic identity. */
export type AstroDirectiveName = Brand<string, 'liteship.target.astro.directive-name'>;

/**
 * One authored activation.
 *
 * `when` is the activation proposition and nothing else. What the proposition
 * is evaluated against, where the residual behaviour runs, which island it
 * joins, and which operation it may invoke are all owned elsewhere and reached
 * through their own contracts.
 */
export interface AuthoredActivation {
  readonly directive: AstroDirectiveName;
  readonly when: EvidenceProposition;
}

/**
 * Why an authored directive could not be translated.
 *
 * Refusal is explicit. An unrecognised directive that quietly produced an
 * always-true activation would ship browser behaviour the author never asked
 * for, which is how the predecessor's silent degradation reached production.
 */
export type AuthoringRefusal = Algebra<{
  'unknown-directive': { readonly directive: AstroDirectiveName; readonly diagnostics: NonEmptyTuple<Diagnostic> };
  'unsatisfiable-proposition': { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

/** The result of translating one authored directive. */
export type AuthoringOutcome = Algebra<{
  translated: { readonly activation: AuthoredActivation };
  refused: { readonly refusal: AuthoringRefusal };
}>;

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

/** The families this home owns, so none is correct and unreached. */
export interface AstroAuthoringTypeSurface {
  readonly directive: AstroDirectiveName;
  readonly activation: AuthoredActivation;
  readonly refusal: AuthoringRefusal;
  readonly outcome: AuthoringOutcome;
}
