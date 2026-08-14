/**
 * Compile-time laws for `01_hosts/web/04_projection`.
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

import type { RevisionReference } from '../../../00_core/02_identity/types.js';
import type { ComponentCatalogAddress, GeneratedStructureAdmission, GeneratedStructureReference, TrustedFragmentPatch } from '../../../00_core/13_stream/types.js';
import type { RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { RuntimeCommit } from '../../../00_core/16_runtime/types.js';
import type { Assert, CaseOf, Equal, TagOf } from '../../../types.js';
import type { RegionAuthorityRequirement, RegionWriteAuthority } from '../01_region/types.js';
import type { SinkPolicyRequirement } from '../02_security/types.js';
import type { EventAuthorityRequirement } from '../03_event/types.js';
import type { CommitApplicationOffer, ComponentRendererCatalog, ProjectionCommit, RendererCatalogRequirement, StructureNodeMapping, WebWriteFamily } from './types.js';

// ---------------------------------------------------------------------------
// Laws
//
// The hostile-input population — iterative walking, depth and node limits,
// cycle detection, getter refusal, own-property-only lookup, closed catalog,
// listener disposal — text-inserts-as-text, and commit/lease coordinate
// agreement are assurance and implementation obligations. That a forged
// lookalike never reaches the renderer is a `system/assurance` obligation.
// ---------------------------------------------------------------------------

/** Compile-time law: opaque foreign output is not a write family. */
export type ForeignOutputIsNotAWriteFamily = Assert<
  Equal<'foreign' extends TagOf<WebWriteFamily> ? true : false, false>
>;


/**
 * Compile-time law: one transaction path. A physical commit centers the
 * semantic `RuntimeCommit`, consumes a transaction lease, and carries no
 * sibling revision for either to disagree with.
 */
export type APhysicalCommitCentersTheSemanticCommit = Assert<
  Equal<
    [
      ProjectionCommit['commit'],
      ProjectionCommit['lease'],
      'revision' extends keyof ProjectionCommit ? true : false,
    ],
    [RuntimeCommit, RegionWriteAuthority, false]
  >
>;


/** Compile-time law: a trusted fragment arrives as a revision-pinned patch, never raw markup. */
export type ATrustedFragmentArrivesAsARevisionPinnedPatch = Assert<
  Equal<CaseOf<WebWriteFamily, 'trusted-fragment'>['patch'], TrustedFragmentPatch>
>;


/** Compile-time law: admission has one owner — the admitted content itself. */
export type AdmissionLivesInTheContentNotBesideIt = Assert<
  Equal<
    [
      'admission' extends keyof CaseOf<WebWriteFamily, 'generated-structure'> ? true : false,
      CaseOf<WebWriteFamily, 'generated-structure'>['content']['admission'],
    ],
    [false, GeneratedStructureAdmission]
  >
>;


/** Compile-time law: the renderer roster consumes the one core catalog species. */
export type TheRendererConsumesTheCoreCatalog = Assert<
  Equal<
    [ComponentRendererCatalog['catalog'], StructureNodeMapping['catalog']],
    [ComponentCatalogAddress, ComponentCatalogAddress]
  >
>;


/** Compile-time law: the mapping is bound to its exact structure and revision. */
export type TheMappingIsBoundToItsAdmittedStructure = Assert<
  Equal<
    [StructureNodeMapping['structure'], StructureNodeMapping['revision']],
    [GeneratedStructureReference, RevisionReference]
  >
>;


/** Compile-time law: application requires every authority it actually uses. */
export type ApplicationRequiresEverythingItUses = Assert<
  Equal<
    [CommitApplicationOffer['requires'], CommitApplicationOffer['id']],
    [
      readonly [
        RegionAuthorityRequirement,
        SinkPolicyRequirement,
        RendererCatalogRequirement,
        EventAuthorityRequirement,
      ],
      RealizationOfferId<'liteship.web.offer.commit-application'>,
    ]
  >
>;
