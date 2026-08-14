/**
 * Physical browser application of admitted core outputs.
 *
 * Core owns patch meaning; this home owns the physical browser commit. One
 * transaction path exists: the semantic `RuntimeCommit` is the single owner
 * of revision, write plan, and trace; the transaction lease is issued by the
 * region's persistent membership for exactly that commit; and the physical
 * web-commit address is minted here and nowhere else. Trusted fragments and
 * generated structures are content families *inside* that path — they cannot
 * bypass the semantic commit and arrive as unrelated sibling authorities.
 *
 * Generated structures render through the core semantic component catalog —
 * the exact same `ComponentCatalogAddress` admission validated against — via
 * a physical renderer roster that maps admitted components to renderers and
 * binds admitted operations through the event authority. Model output can
 * never enter the trusted-fragment route, and opaque foreign output is not a
 * write family at all.
 *
 * @module
 */

import type {
  Algebra,
  Hole,
  NonEmptyTuple,
  Signature,
} from '../../../types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { CanonicalValue, ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { RevisionReference } from '../../../00_core/02_identity/types.js';
import type {
  ComponentCatalogAddress,
  CatalogComponentId,
  GeneratedStructureAdmission,
  GeneratedStructurePatch,
  GeneratedStructureReference,
  GeneratedStructureSnapshot,
  StructureNodeReference,
  TrustedFragmentPatch,
} from '../../../00_core/13_stream/types.js';
import type { GroundingId, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { RuntimeCommit } from '../../../00_core/16_runtime/types.js';
import type { SemanticCut } from '../../../00_core/08_state/types.js';
import type { WebGroundingDefinition, WebRealizationOffer } from '../00_bootstrap/types.js';
import type { SinkPolicyRequirement } from '../02_security/types.js';
import type { EventAuthorityRequirement } from '../03_event/types.js';
import type {
  RegionAuthorityRequirement,
  RegionPreservationProfile,
  RegionReference,
  RegionWriteAuthority,
  WebNodeReference,
} from '../01_region/types.js';

/** Address family of one applied physical browser commit. */
export type WebCommitAddress = ContentAddress<'application/vnd.liteship.web-commit+cbor'>;

/**
 * The content families a commit may carry beside its runtime write plan. Each
 * arm carries its admitted, revision-bound payload; none carries raw markup,
 * raw selectors, or an unadmitted tree, and admission is read from the
 * content that already carries it.
 */
export type WebWriteFamily = Algebra<{
  'trusted-fragment': { readonly patch: TrustedFragmentPatch };
  'generated-structure': {
    readonly content: GeneratedStructureSnapshot | GeneratedStructurePatch;
  };
}>;

/**
 * The physical renderer roster for generated structures: it consumes the
 * exact core catalog address admission used — never a neighboring species —
 * and maps admitted semantic components to physical renderers.
 */
export interface ComponentRendererCatalog {
  readonly catalog: ComponentCatalogAddress;
  readonly renderers: readonly {
    readonly component: CatalogComponentId;
    readonly render: Signature<CanonicalValue, WebNodeReference, NonEmptyTuple<Diagnostic>>;
  }[];
}

/**
 * The renderer's separate admitted mapping from generated-structure nodes to
 * physical nodes: bound to the exact structure, revision, catalog, and
 * admission it maps for, inside one region, at one address.
 */
export interface StructureNodeMapping {
  readonly region: RegionReference;
  readonly structure: GeneratedStructureReference;
  readonly revision: RevisionReference;
  readonly catalog: ComponentCatalogAddress;
  readonly admission: GeneratedStructureAdmission;
  readonly entries: readonly {
    readonly node: StructureNodeReference;
    readonly physical: WebNodeReference;
  }[];
  readonly address: ContentAddress<'application/vnd.liteship.web-structure-mapping+cbor'>;
}

/**
 * One coherent browser commit: one semantic `RuntimeCommit`, one transaction
 * lease issued for exactly it, the content families applied with it, and the
 * physical result address. The commit deliberately carries no sibling
 * revision — the semantic commit and the lease own the coordinates, and that
 * they agree is an assurance obligation over the erased values.
 */
export interface ProjectionCommit<Cut extends SemanticCut = SemanticCut> {
  readonly commit: RuntimeCommit<Cut>;
  readonly lease: RegionWriteAuthority;
  readonly families: readonly WebWriteFamily[];
  readonly preserved: RegionPreservationProfile;
  readonly address: WebCommitAddress;
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

/** The capability to apply one coherent commit at the physical sinks. */
export interface CommitApplication {
  readonly apply: Signature<ProjectionCommit, WebCommitAddress, NonEmptyTuple<Diagnostic>>;
}

export type CommitApplicationRequirement = Hole<'liteship.web.commit-application', CommitApplication>;
export type RendererCatalogRequirement = Hole<'liteship.web.renderer-catalog', ComponentRendererCatalog>;

/** Deployment grounding: the renderer roster arrives as an addressed artifact. */
export interface RendererCatalogGrounding
  extends WebGroundingDefinition<
    readonly [RendererCatalogRequirement],
    ComponentRendererCatalog,
    'deployment',
    'unowned'
  > {
  readonly id: GroundingId<'liteship.web.grounding.renderer-catalog'>;
}

/**
 * Commit application is an offer requiring everything it actually uses: the
 * region manager whose leases it consumes, the sink policy it enforces at
 * every write, the renderer catalog generated structures render through, and
 * the event authority their admitted operations bind listeners with. It
 * cannot claim to apply generated structures while lacking the renderer or
 * the event path.
 */
export interface CommitApplicationOffer
  extends WebRealizationOffer<
    readonly [CommitApplicationRequirement],
    readonly [
      RegionAuthorityRequirement,
      SinkPolicyRequirement,
      RendererCatalogRequirement,
      EventAuthorityRequirement,
    ],
    unknown,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.web.offer.commit-application'>;
  readonly locations: NonEmptyTuple<'local' | 'live'>;
  readonly backends: NonEmptyTuple<'javascript'>;
}

/** Type summary consumed by the web topology. */
export interface WebProjectionTypeSurface {
  readonly family: WebWriteFamily;
  readonly renderer: ComponentRendererCatalog;
  readonly mapping: StructureNodeMapping;
  readonly commit: ProjectionCommit;
  readonly rendererGrounding: RendererCatalogGrounding;
  readonly application: CommitApplicationOffer;
}
