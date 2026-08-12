/**
 * Astro's side of island activation: directive and lifecycle translation, and
 * the ancestry of the entry artifact that carries an island into a page.
 *
 * The physical act stays in `01_hosts/web/11_island`, which already owns the
 * exact program, revision, retained-update window, region membership, and
 * activation authority. This home owns the translation into that contract and
 * nothing underneath it. `IslandJoin` is imported, never restated: a local twin
 * would be structurally identical to the compiler and would drift the first
 * time web changed.
 *
 * The predecessor joined islands to a manifest by content address and, when the
 * manifest was stale, `find` returned undefined, every `??=` became a no-op,
 * and the island rendered with no diagnostic at all. Ancestry here is a member,
 * not a lookup.
 *
 * @module
 */

import type { Algebra, Assert, CaseOf, Equal, NonEmptyTuple } from '../../../types.js';
import type { RevisionId } from '../../../00_core/02_identity/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type {
  IslandActivationAuthority,
  IslandJoin,
  IslandReference,
} from '../../../01_hosts/web/11_island/types.js';
import type {
  ProducedArtifact,
  TargetConfigurationId,
  TargetConfigurationRevision,
} from '../../types.js';
import type { AuthoredActivation } from '../02_authoring/types.js';

/**
 * One island Astro mounts, with the artifact that carries it.
 *
 * `join` is web's authority. `entry` is the umbrella's produced artifact, whose
 * `predecessors` carry the ancestry back to the residual program. The exact
 * configuration revision is carried because two configurations of one project
 * produce different entries, and the predecessor could not tell them apart.
 */
export interface AstroIslandEntry<
  Config extends TargetConfigurationId = TargetConfigurationId,
  Revision extends RevisionId = RevisionId,
> {
  readonly island: IslandReference;
  readonly activation: AuthoredActivation;
  readonly join: IslandJoin;
  readonly entry: ProducedArtifact;
  readonly configuration: TargetConfigurationRevision<Config, Revision>;
}

/**
 * Why an island could not be prepared for activation.
 *
 * Distinct from web's activation failure, which is about the physical act. This
 * is the translation refusing before anything is attempted.
 */
export type IslandPreparationRefusal = Algebra<{
  'unresolved-ancestry': { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  'unmountable-activation': { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

/** The result of preparing one authored island for the web host. */
export type IslandPreparation<
  Config extends TargetConfigurationId = TargetConfigurationId,
  Revision extends RevisionId = RevisionId,
> = Algebra<{
  prepared: { readonly entry: AstroIslandEntry<Config, Revision> };
  refused: { readonly refusal: IslandPreparationRefusal };
}>;

// ---------------------------------------------------------------------------
// Laws

type LawConfig = TargetConfigurationId<'astro.build'>;
type LawRevision = RevisionId;

/**
 * Compile-time law: the join is web's authority, not a local twin.
 *
 * `Equal` is invariant, so a structurally identical local declaration would
 * fail this even though the compiler treats the two shapes as the same type.
 * That is the whole reason the law is written against the imported name.
 */
export type TheJoinIsTheWebAuthority = Assert<
  Equal<AstroIslandEntry['join'], IslandJoin>
>;

/**
 * Compile-time law: this home does not own the activation decision.
 *
 * No `activate`, no authority, no instance. Astro prepares; web activates. A
 * target that could activate would be a second execution host.
 */
export type AstroPreparesButDoesNotActivate = Assert<
  Equal<
    [
      'activate' extends keyof AstroIslandEntry ? true : false,
      'authority' extends keyof AstroIslandEntry ? true : false,
      'instance' extends keyof AstroIslandEntry ? true : false,
      AstroIslandEntry extends IslandActivationAuthority ? true : false,
    ],
    [false, false, false, false]
  >
>;

/** Compile-time law: an island entry pins its exact configuration revision. */
export type AnIslandEntryPinsItsExactConfiguration = Assert<
  Equal<
    AstroIslandEntry<LawConfig, LawRevision>['configuration'],
    TargetConfigurationRevision<LawConfig, LawRevision>
  >
>;

/**
 * Compile-time law: the entry binds a produced artifact rather than restating
 * artifact facts.
 *
 * Ancestry lives on `ProducedArtifact.predecessors`. An entry that carried its
 * own address, digest, or predecessor list would be a second artifact
 * vocabulary inside a target child.
 */
export type AnIslandEntryRestatesNoArtifactFacts = Assert<
  Equal<
    [
      Equal<AstroIslandEntry['entry'], ProducedArtifact>,
      'address' extends keyof AstroIslandEntry ? true : false,
      'digest' extends keyof AstroIslandEntry ? true : false,
      'predecessors' extends keyof AstroIslandEntry ? true : false,
      'manifest' extends keyof AstroIslandEntry ? true : false,
    ],
    [true, false, false, false, false]
  >
>;

/**
 * Compile-time law: unresolved ancestry is refused out loud.
 *
 * The predecessor's stale-manifest path produced a rendered island with no
 * diagnostic. Here the refusal carries a non-empty diagnostic tuple, so the
 * quiet version is unrepresentable.
 */
export type UnresolvedAncestryIsRefusedOutLoud = Assert<
  Equal<
    [
      Equal<CaseOf<IslandPreparationRefusal, 'unresolved-ancestry'>['diagnostics'], NonEmptyTuple<Diagnostic>>,
      'entry' extends keyof CaseOf<IslandPreparation, 'refused'> ? true : false,
    ],
    [true, false]
  >
>;

/** The families this home owns, so none is correct and unreached. */
export interface AstroIslandTypeSurface {
  readonly entry: AstroIslandEntry;
  readonly refusal: IslandPreparationRefusal;
  readonly preparation: IslandPreparation;
}
