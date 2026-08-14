/**
 * Compile-time laws for `01_hosts`.
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

import type { SchemaReference } from '../00_core/03_schema/types.js';
import type { RealizationCatalogAddress, RealizationLifecycle, RealizationOfferDescriptor, RequirementId, StepInputBinding } from '../00_core/14_compiler/types.js';
import type { Assert, Binding, BindingRow, Equal, FailureOf, Hole, IsNever, NonEmptyTuple, OutputOf, RequirementsOf, TagOf } from '../types.js';
import type { HostAdmissionFailure, HostAuthorityBoundary, HostCapabilityCatalog, HostChildName, HostChildRoster, HostDefinition, HostGroundingDefinition, HostGroundingDescriptor, HostId, HostRealm, HostReference, RealizationCatalog } from './types.js';

// ---------------------------------------------------------------------------
// Laws
//
// These test the shared boundary shape. That a host imports its provided holes
// from their owners, that a grounded value genuinely entered through its
// declared origin, that only the bootstrap mints instances, and that a
// provider disposes once are proof obligations for assurance and
// implementation, not type laws.
// ---------------------------------------------------------------------------

type ExampleHostRequirement = Hole<'liteship.example.host-authority', { readonly use: () => void }>;

type ExampleGrounding = HostGroundingDefinition<readonly [ExampleHostRequirement], unknown>;


/** Compile-time law: build is a settlement location, never a host realm. */
export type HostRealmsExcludeBuild = Assert<
  Equal<'build' extends HostRealm ? true : false, false>
>;


/** Compile-time law: an authority boundary refuses an arbitrary binding row. */
export type HostBoundaryRejectsAFreeBindingRow = Assert<
  Equal<BindingRow extends HostAuthorityBoundary<readonly [ExampleHostRequirement]> ? true : false, false>
>;


/** Compile-time law: a grounding cannot claim the same authority twice. */
export type HostGroundingRejectsADuplicateRow = Assert<
  IsNever<
    HostGroundingDefinition<readonly [ExampleHostRequirement, ExampleHostRequirement]>['provides']
  >
>;


/**
 * Compile-time law: admission has no LiteShip prerequisites. A grounded root
 * exists independently of the plan; a requirement row here would be a hidden
 * construction step wearing a grounding's name.
 */
export type GroundingAdmissionHasNoPrerequisites = Assert<
  Equal<RequirementsOf<ExampleGrounding['admit']>, readonly []>
>;


/**
 * Compile-time law: admission fails with the admission algebra — never with a
 * pre-candidate rejection, never with a construction failure.
 */
export type GroundingAdmissionFailsOnlyAtTheBoundary = Assert<
  Equal<FailureOf<ExampleGrounding['admit']>, HostAdmissionFailure>
>;


/** Compile-time law: admission yields one exact binding per provided hole. */
export type GroundingAdmissionYieldsExactBindings = Assert<
  Equal<OutputOf<ExampleGrounding['admit']>['bindings'], readonly [Binding<ExampleHostRequirement>]>
>;


/** Compile-time law: an erased descriptor still provides at least one authority. */
export type ADescriptorProvidesAtLeastOneAuthority = Assert<
  Equal<HostGroundingDescriptor['provides'], NonEmptyTuple<RequirementId>>
>;


/**
 * Compile-time law: the catalog contains actual descriptors — grounding and
 * offer — never bare references to hypothetical ones and never bare
 * requirement names asserted on the host's own say-so.
 */
export type TheCatalogContainsActualDescriptors = Assert<
  Equal<
    [HostCapabilityCatalog['groundings'], HostCapabilityCatalog['offers']],
    [readonly HostGroundingDescriptor[], readonly RealizationOfferDescriptor[]]
  >
>;


/** Compile-time law: a grounding descriptor pins custody and input classification. */
export type AGroundingDescriptorPinsCustodyAndInput = Assert<
  Equal<
    [HostGroundingDescriptor['lifecycle'], HostGroundingDescriptor['inputBinding'], HostGroundingDescriptor['input']],
    [TagOf<RealizationLifecycle>, TagOf<StepInputBinding>, SchemaReference]
  >
>;


/**
 * Compile-time law: the realization catalog is the addressed product of the
 * descriptor populations planning consumes, owning the exact address plans
 * reference — and every host catalog names the catalog it contributes to.
 */
export type TheRealizationCatalogOwnsItsAddress = Assert<
  Equal<
    [
      RealizationCatalog['groundings'],
      RealizationCatalog['offers'],
      RealizationCatalog['address'],
      HostCapabilityCatalog['contributes'],
    ],
    [
      readonly HostGroundingDescriptor[],
      readonly RealizationOfferDescriptor[],
      RealizationCatalogAddress,
      RealizationCatalogAddress,
    ]
  >
>;


/**
 * Compile-time law: the deprecated `grounded` name stays retired from
 * catalogs. It conflated declared, selected, and admitted; its successor is
 * `groundings`, and the old key may not return beside it at any type.
 */
export type TheDeprecatedGroundedNameStaysRetiredFromCatalogs = Assert<
  Equal<'grounded' extends keyof HostCapabilityCatalog ? true : false, false>
>;


type ExampleHostIdentity = HostId<'liteship.example.host'>;


/**
 * Compile-time law: a definition and its catalog share one host identity and
 * one realm through the type parameters — a web definition carrying a server
 * catalog is not constructible at the declaration boundary.
 */
export type ADefinitionSharesIdentityAndRealmWithItsCatalog = Assert<
  Equal<
    [
      HostDefinition<ExampleHostIdentity, 'web'>['catalog']['host'],
      HostDefinition<ExampleHostIdentity, 'web'>['catalog']['realm'],
    ],
    [HostReference<ExampleHostIdentity>, 'web']
  >
>;


/**
 * Compile-time law: the child roster and the host-realm union are the same
 * population — every realm has exactly one child home, no child exists
 * outside the realm union, and the order is exact. A fifth child or a
 * missing one breaks this law before any prose could drift.
 */
export type TheChildRosterMatchesTheRealms = Assert<
  Equal<
    [HostChildRoster[number], HostChildName, HostChildRoster[0], HostChildRoster[3]],
    [HostRealm, HostRealm, 'web', 'server']
  >
>;
