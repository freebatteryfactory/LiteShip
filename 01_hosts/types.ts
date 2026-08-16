/**
 * Shared physical-host realization contract.
 *
 * A host makes unresolved physical behavior real. It binds authorities that
 * core declared but could not construct, and it may declare host-local
 * authorities of its own. It never redefines what an upstream authority means.
 *
 * This umbrella owns only what every host realm shares. Concrete environment
 * APIs belong to the child host homes — web, worker, edge, and server — all
 * of which exist as specified architecture. The child roster below is the
 * population finalization this file deferred until every named directory
 * physically existed and could be mechanically checked.
 *
 * @module
 */

import type {
  Algebra,
  BindingsFor,
  Brand,
  CaseOf,
  ContextOf,
  NonEmptyTuple,
  Reference,
  RequirementRow,
  Signature,
  TagOf,
  UniqueRequirements,
} from '../types.js';
import type { Diagnostic } from '../00_core/00_error/types.js';
import type { ContentAddress } from '../00_core/01_encoding/types.js';
import type { EvidenceRealm } from '../00_core/06_evidence/types.js';
import type { PolicyId } from '../00_core/07_operation/types.js';
import type { SchemaReference } from '../00_core/03_schema/types.js';
import type {
  GroundingId,
  GroundingReference,
  NonEmptyRequirementRow,
  RealizationCatalogAddress,
  RealizationLifecycle,
  RealizationOfferDescriptor,
  RequirementId,
  StepInputBinding,
} from '../00_core/14_compiler/types.js';

/**
 * Realms in which a host physically executes.
 *
 * Build is a settlement location, not a host. The exclusion reuses core's
 * `EvidenceRealm` authority rather than restating the union, matching how
 * `06_evidence` already narrows it for foreign evidence adapters.
 */
export type HostRealm = Exclude<EvidenceRealm, 'build'>;

/** Stable identity for one host. */
export type HostId<Name extends string = string> = Brand<Name, 'liteship.host-id'>;
/** Typed reference to one host. */
export type HostReference<Id extends HostId = HostId> = Reference<'host', Id>;

/** Identity of one live admitted grounding: the provider that is disposed once. */
export type HostGroundingInstanceId<Name extends string = string> = Brand<
  Name,
  'liteship.host-grounding-instance-id'
>;

/**
 * An authority boundary accepts exact bindings for an exact requirement row.
 *
 * A free `BindingRow` is deliberately not accepted. Accepting one would let a
 * caller hand over an unrelated collection of bindings and assert that the
 * capabilities line up, which is the substitution this whole layer exists to
 * prevent.
 */
export type HostAuthorityBoundary<Row extends RequirementRow> = BindingsFor<Row>;

/** The ergonomic execution view derived from a satisfied host boundary. */
export type HostExecutionContext<Row extends RequirementRow> = ContextOf<Row>;

/**
 * Where a grounded value entered the host boundary.
 *
 * Grounding admits an authority that already exists at the boundary before any
 * plan materializes; an offer causes an authority to exist through selected
 * construction. The origin names which explicit ingress the value used. It is
 * deliberately small and generic: the concrete source vocabulary — a document,
 * a request, an injected client — belongs to the child home that owns it.
 */
export type HostGroundingOrigin = Algebra<{
  /** A host-environment intrinsic captured at bootstrap. */
  intrinsic: Record<never, never>;
  /** A value carried by the invocation that entered the host. */
  invocation: Record<never, never>;
  /** A binding supplied by deployment configuration. */
  deployment: Record<never, never>;
  /** A value the embedding application handed to the bootstrap. */
  application: Record<never, never>;
}>;

/**
 * Why the admission boundary refused a supplied boundary value.
 *
 * This is a third channel, deliberately distinct from both compiler refusals.
 * A `RealizationRejection` says no lawful plan exists; a `RealizationFailure`
 * says a selected lawful construction did not survive. An admission failure
 * says the world handed the bootstrap something it will not vouch for — before
 * planning ever saw it as a root.
 */
export type HostAdmissionFailure = Algebra<{
  'malformed-boundary-value': {
    readonly grounding: GroundingReference;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };
  'admission-refused': {
    readonly grounding: GroundingReference;
    readonly policy: PolicyId;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };
}>;

/**
 * One live admitted grounding: exact bindings plus custody.
 *
 * The lifecycle arm records custody, not construction: `unowned` means the
 * supplier keeps the value's lifetime, `owned` means custody transferred into
 * LiteShip and this provider is disposed exactly once. Admission never creates
 * the lifetime either way.
 */
export interface HostGroundingInstance<
  Provides extends NonEmptyRequirementRow = NonEmptyRequirementRow,
  Life extends TagOf<RealizationLifecycle> = TagOf<RealizationLifecycle>,
> {
  readonly id: HostGroundingInstanceId;
  readonly grounding: GroundingReference;
  readonly bindings: HostAuthorityBoundary<Provides>;
  readonly lifecycle: CaseOf<RealizationLifecycle, Life>;
}

/**
 * The typed declaration of one grounding slot.
 *
 * One definition denotes one root slot. A shared admission implementation may
 * back several definitions internally, but reusing one slot twice within one
 * plan would require a selection identity that does not exist — it must be a
 * second declared slot, never an invisible double-use.
 *
 * `admit` validates, narrows, scopes, attenuates, or wraps the supplied value.
 * It never performs provider selection, resource acquisition, permission
 * negotiation, network or storage work, or lifecycle creation — anything that
 * causes an authority to exist is an offer. Two of those prohibitions are
 * structural: the requirement row is exactly empty, so no LiteShip
 * prerequisite can hide behind admission, and the failure channel is the
 * admission algebra, so a grounding cannot launder a construction failure.
 *
 * Only the host bootstrap mints instances from this declaration. Downstream
 * modules consume admitted authorities; they do not fabricate grounding-shaped
 * objects, and that this is so is a `system/assurance` obligation, as is the
 * claim that `provides` names canonical owner imports.
 */
export interface HostGroundingDefinition<
  Provides extends NonEmptyRequirementRow = NonEmptyRequirementRow,
  Input = unknown,
> {
  readonly id: GroundingId;
  readonly host: HostReference;
  readonly realm: HostRealm;
  readonly origin: HostGroundingOrigin;
  readonly provides: UniqueRequirements<Provides>;
  readonly admit: Signature<Input, HostGroundingInstance<Provides>, HostAdmissionFailure, readonly []>;
  readonly address: ContentAddress<'application/vnd.liteship.host-grounding+cbor'>;
}

/**
 * The erased, addressed form of one grounding declaration.
 *
 * Exact generic rows do not survive a heterogeneous collection, so catalogs
 * and plans hold descriptors and references. That a descriptor agrees with the
 * typed declaration it was derived from is a `system/assurance` obligation.
 */
export interface HostGroundingDescriptor {
  readonly grounding: GroundingReference;
  readonly host: HostReference;
  readonly realm: HostRealm;
  readonly origin: TagOf<HostGroundingOrigin>;
  readonly provides: NonEmptyTuple<RequirementId>;
  readonly lifecycle: TagOf<RealizationLifecycle>;
  readonly inputBinding: TagOf<StepInputBinding>;
  readonly input: SchemaReference;
  readonly address: ContentAddress<'application/vnd.liteship.host-grounding+cbor'>;
}

/**
 * One host's erased, addressable capability catalog.
 *
 * The catalog contains the actual erased descriptors — grounding and offer —
 * not references to hypothetical ones. Plans select references *into* these
 * descriptor populations, and `RealizationCatalogAddress` content-addresses
 * exactly this collection, so the address and its contents finally recognize
 * one another. Availability is still not admission: a listed slot's boundary
 * value may be absent, malformed, wrong-realm, or refused by policy when the
 * bootstrap attempts admission, and only successful admission yields a live
 * `HostGroundingInstance`.
 */
export interface HostCapabilityCatalog<
  Id extends HostId = HostId,
  Realm extends HostRealm = HostRealm,
> {
  readonly host: HostReference<Id>;
  readonly realm: Realm;
  readonly groundings: readonly HostGroundingDescriptor[];
  readonly offers: readonly RealizationOfferDescriptor[];
  readonly contributes: RealizationCatalogAddress;
  readonly address: ContentAddress<'application/vnd.liteship.host-catalog+cbor'>;
}

/**
 * The exact addressed realization catalog: the grounding and offer descriptor
 * populations actually used for planning, owning the very
 * `RealizationCatalogAddress` that plans and refusals reference. Host
 * catalogs contribute their descriptor populations into this product, and the
 * address changes when descriptor semantics change — an assurance property
 * over canonical encoding, but one this product must exist to carry. The
 * descriptor exists, the catalog exists, the address exists, and this is the
 * type that binds all three together.
 */
export interface RealizationCatalog {
  readonly groundings: readonly HostGroundingDescriptor[];
  readonly offers: readonly RealizationOfferDescriptor[];
  readonly address: RealizationCatalogAddress;
}

/**
 * One host home's declared physical surface.
 *
 * The definition and its catalog share one host identity and one realm by
 * type parameter, not by two independently writable copies — a web definition
 * cannot carry a server catalog. At the erased default both facts still exist
 * twice, so descriptor-level agreement remains a `system/assurance` check.
 */
export interface HostDefinition<
  Id extends HostId = HostId,
  Realm extends HostRealm = HostRealm,
> {
  readonly id: Id;
  readonly realm: Realm;
  readonly catalog: HostCapabilityCatalog<Id, Realm>;
}

// ---------------------------------------------------------------------------
// The child roster — the population finalization this umbrella deferred until
// all four child homes physically existed. They now do: web, worker, edge,
// and server each carry a complete architecture beneath this directory. This
// is a narrow population seal, not a reopening of the realization calculus.
// ---------------------------------------------------------------------------

/** The four child hosts, in design order. Exactly these; a fifth is a new decision. */
export type HostChildName = 'web' | 'worker' | 'edge' | 'server';

/** The ordered child roster the physical tree carries. */
export type HostChildRoster = readonly ['web', 'worker', 'edge', 'server'];
