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
 * A stale manifest lookup must not fall through to a degraded render with no
 * diagnostic. Ancestry here is a member, not a best-effort lookup.
 *
 * @module
 */

import type {
  Algebra,
  NonEmptyTuple,
} from '../../../types.js';
import type { RevisionId } from '../../../00_core/02_identity/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type {
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
 * produce different entries and must not share identity.
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

/** The families this home owns, so none is correct and unreached. */
export interface AstroIslandTypeSurface {
  readonly entry: AstroIslandEntry;
  readonly refusal: IslandPreparationRefusal;
  readonly preparation: IslandPreparation;
}
