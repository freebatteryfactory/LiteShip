/**
 * Compile-time laws for `02_targets/astro/06_development`.
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
import type { Assert, Brand, CaseOf, Equal, NonEmptyTuple } from '../../../types.js';
import type { ProducedArtifact, TargetConfigurationId, TargetConfigurationRevision } from '../../types.js';
import type { DevelopmentEvidence, GeneratedDeclaration, WatchedSource } from './types.js';

// ---------------------------------------------------------------------------
// Laws

type LawConfig = TargetConfigurationId<'astro.build'>;

type LawRevision = RevisionId;


/**
 * Compile-time law: development output and produced artifacts are distinct.
 *
 * Both directions, because a one-directional check passes when the two
 * collapse. If a generated declaration were assignable to `ProducedArtifact`,
 * a dev-server convenience could fill an artifact slot in a real composition.
 */
export type DevelopmentOutputAndProducedArtifactsAreNotSubstitutable = Assert<
  Equal<
    [
      GeneratedDeclaration extends ProducedArtifact ? true : false,
      ProducedArtifact extends GeneratedDeclaration ? true : false,
    ],
    [false, false]
  >
>;


/** Compile-time law: a generated declaration pins its exact configuration revision. */
export type AGeneratedDeclarationPinsItsConfiguration = Assert<
  Equal<
    GeneratedDeclaration<LawConfig, LawRevision>['configuration'],
    TargetConfigurationRevision<LawConfig, LawRevision>
  >
>;


/**
 * Compile-time law: a watched source is an admitted path, never a raw string.
 *
 * The brand is the admission. Comparing against the literal brand rather than
 * the alias means the law still fails if `AdmittedSourcePath` loosens to
 * `string`.
 */
export type AWatchedSourceIsAdmitted = Assert<
  Equal<
    [
      Equal<WatchedSource['path'], Brand<string, 'liteship.target.astro.admitted-source-path'>>,
      string extends WatchedSource['path'] ? true : false,
    ],
    [true, false]
  >
>;


/**
 * Compile-time law: stale is neither fresh nor absent.
 *
 * Three distinct arms, with stale carrying the diagnostic that explains why
 * the current declaration cannot be used.
 */
export type DevelopmentEvidenceKeepsStaleDistinctAndDiagnosed = Assert<
  Equal<
    [
      Equal<DevelopmentEvidence['_tag'], 'fresh' | 'stale' | 'unavailable'>,
      Equal<CaseOf<DevelopmentEvidence, 'stale'>['diagnostics'], NonEmptyTuple<Diagnostic>>,
    ],
    [true, true]
  >
>;
