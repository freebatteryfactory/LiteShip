/**
 * Development-time inspection: watched sources, generated declarations, the
 * codegen location, and toolbar attachment.
 *
 * Development convenience is the easiest place for authority to leak. A watcher
 * that could mint an artifact, a generated declaration that outlived the dev
 * server, or a stale source silently substituted for a fresh one would each let
 * a convenience become a production fact.
 *
 * So this home carries no production authority at all, and says so in a law
 * rather than a comment. Its outputs are development evidence: addressed,
 * revision-bound, and refusable.
 *
 * @module
 */

import type { Algebra, Assert, Brand, CaseOf, Equal, NonEmptyTuple } from '../../../types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { RevisionId } from '../../../00_core/02_identity/types.js';
import type { RevisionReference } from '../../../00_core/02_identity/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type {
  ProducedArtifact,
  TargetConfigurationId,
  TargetConfigurationRevision,
} from '../../types.js';

/**
 * A path this child is willing to read.
 *
 * Admitted, not raw. A development watcher that accepted arbitrary filesystem
 * paths would be a read primitive with a friendly name.
 */
export type AdmittedSourcePath = Brand<string, 'liteship.target.astro.admitted-source-path'>;

/** The directory the ecosystem allocates for generated declarations. */
export type CodegenLocation = Brand<string, 'liteship.target.astro.codegen-location'>;

/** One source whose change invalidates development evidence. */
export interface WatchedSource<Revision extends RevisionId = RevisionId> {
  readonly path: AdmittedSourcePath;
  readonly revision: RevisionReference<Revision>;
}

/**
 * One generated declaration, addressed and bound to what produced it.
 *
 * Carries the configuration revision because two configurations generate
 * different declarations, and a declaration that cannot name its configuration
 * cannot be invalidated when that configuration changes.
 */
export interface GeneratedDeclaration<
  Config extends TargetConfigurationId = TargetConfigurationId,
  Revision extends RevisionId = RevisionId,
> {
  readonly location: CodegenLocation;
  readonly address: ContentAddress<'application/vnd.liteship.astro-generated-types+json'>;
  readonly configuration: TargetConfigurationRevision<Config, Revision>;
  readonly sources: readonly WatchedSource<Revision>[];
}

/**
 * Development evidence, or an explicit refusal.
 *
 * `stale` is its own arm. The predecessor's failure mode was serving evidence
 * derived from sources that had already moved; a stale result that presented as
 * fresh is worse than no result, because nothing downstream can tell.
 */
export type DevelopmentEvidence<
  Config extends TargetConfigurationId = TargetConfigurationId,
  Revision extends RevisionId = RevisionId,
> = Algebra<{
  fresh: { readonly declaration: GeneratedDeclaration<Config, Revision> };
  stale: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  unavailable: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

// ---------------------------------------------------------------------------
// Laws

type LawConfig = TargetConfigurationId<'astro.build'>;
type LawRevision = RevisionId;

/**
 * Compile-time law: development output is not a produced artifact.
 *
 * Both directions, because a one-directional check passes when the two
 * collapse. If a generated declaration were assignable to `ProducedArtifact`,
 * a dev-server convenience could fill an artifact slot in a real composition.
 */
export type DevelopmentOutputHasNoProductionAuthority = Assert<
  Equal<
    [
      GeneratedDeclaration extends ProducedArtifact ? true : false,
      ProducedArtifact extends GeneratedDeclaration ? true : false,
      'producer' extends keyof GeneratedDeclaration ? true : false,
      'slot' extends keyof GeneratedDeclaration ? true : false,
      'artifact' extends keyof GeneratedDeclaration ? true : false,
    ],
    [false, false, false, false, false]
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
 * Three distinct arms, and only `fresh` carries a declaration. A stale result
 * that could carry one would be indistinguishable from a current answer.
 */
export type StaleIsNeitherFreshNorAbsent = Assert<
  Equal<
    [
      Equal<DevelopmentEvidence['_tag'], 'fresh' | 'stale' | 'unavailable'>,
      'declaration' extends keyof CaseOf<DevelopmentEvidence, 'stale'> ? true : false,
      'declaration' extends keyof CaseOf<DevelopmentEvidence, 'unavailable'> ? true : false,
      Equal<CaseOf<DevelopmentEvidence, 'stale'>['diagnostics'], NonEmptyTuple<Diagnostic>>,
    ],
    [true, false, false, true]
  >
>;

/** The families this home owns, so none is correct and unreached. */
export interface AstroDevelopmentTypeSurface {
  readonly path: AdmittedSourcePath;
  readonly watched: WatchedSource;
  readonly declaration: GeneratedDeclaration;
  readonly evidence: DevelopmentEvidence;
}
