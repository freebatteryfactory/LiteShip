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

import type {
  Algebra,
  Brand,
  NonEmptyTuple,
} from '../../../types.js';
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

/** The families this home owns, so none is correct and unreached. */
export interface AstroAuthoringTypeSurface {
  readonly directive: AstroDirectiveName;
  readonly activation: AuthoredActivation;
  readonly refusal: AuthoringRefusal;
  readonly outcome: AuthoringOutcome;
}
