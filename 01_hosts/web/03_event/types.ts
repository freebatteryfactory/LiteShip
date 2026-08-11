/**
 * Browser events: identity, admitted observation, projection, and lifetime.
 *
 * A browser event becomes core evidence or an admitted operation invocation —
 * never a free function. An event has identity: a descriptor names its kind
 * and subscription options, an admitted observation carries its target and
 * payload, and typed projections turn observations into `EvidenceUpdate` or
 * `OperationInvocation` values. Identity has one owner: the produced value
 * carries its own evidence reference or operation reference, and no sibling
 * field restates either for the two to disagree about.
 *
 * The plan provides a persistent subscription authority, not one inert
 * subscription record: subscriptions are dynamic per-use resources created
 * through the authority's typed subscribe operation from a complete request —
 * descriptor, target, projection, and the persistent region membership they
 * attach to. Every listener is an owned resource with a named owner; a
 * listener outlives one transaction but never its membership.
 *
 * @module
 */

import type {
  Algebra,
  Assert,
  Brand,
  CaseOf,
  Equal,
  Hole,
  InputOf,
  NonEmptyTuple,
  OutputOf,
  Reference,
  Signature,
  TagOf,
} from '../../../types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { CanonicalValue } from '../../../00_core/01_encoding/types.js';
import type { EvidenceUpdate } from '../../../00_core/06_evidence/types.js';
import type { OperationInvocation } from '../../../00_core/07_operation/types.js';
import type {
  GroundingId,
  RealizationInstanceReference,
  RealizationLifecycle,
  RealizationOfferId,
} from '../../../00_core/14_compiler/types.js';
import type { SchemaReference } from '../../../00_core/03_schema/types.js';
import type { WebGroundingDefinition, WebRealizationOffer } from '../00_bootstrap/types.js';
import type {
  RegionAuthorityRequirement,
  RegionMembership,
  WebNodeReference,
} from '../01_region/types.js';

export type ListenerId<Name extends string = string> = Brand<Name, 'liteship.web.listener-id'>;
export type ListenerReference<Id extends ListenerId = ListenerId> = Reference<'web-listener', Id>;
/** Physical browser event kind identity. The roster is implementation evidence. */
export type WebEventKind = Brand<string, 'liteship.web.event-kind'>;

/** Subscription options with semantic consequence. */
export interface EventSubscriptionOptions {
  readonly capture: boolean;
  readonly passive: boolean;
  readonly once: boolean;
}

/** What is being observed, and how. */
export interface WebEventDescriptor {
  readonly kind: WebEventKind;
  readonly options: EventSubscriptionOptions;
}

export type WebObservationId<Name extends string = string> = Brand<Name, 'liteship.web.observation-id'>;
export type WebObservationReference<Id extends WebObservationId = WebObservationId> = Reference<
  'web-observation',
  Id
>;

/** One admitted physical observation: its own identity, place, and payload. */
export interface AdmittedEventObservation {
  readonly id: WebObservationReference;
  readonly descriptor: WebEventDescriptor;
  readonly target: WebNodeReference;
  readonly payload: CanonicalValue;
}

/**
 * A complete observation request: the facility cannot observe what it was
 * never pointed at, so the request names the target, the descriptor, and the
 * payload contract the admitted payload must decode against.
 */
export interface EventObservationRequest {
  readonly target: WebNodeReference;
  readonly descriptor: WebEventDescriptor;
  readonly payload: SchemaReference;
}

/**
 * Where an observed browser event goes. Two arms, deliberately: a typed
 * projection into core evidence, or a typed projection into an admitted
 * operation invocation. The produced value owns its identity — the update
 * carries its evidence reference, the invocation carries its operation
 * reference — so no sibling field exists to contradict it. There is no arm
 * for an arbitrary callback.
 */
export type EventProjection = Algebra<{
  evidence: {
    readonly project: Signature<AdmittedEventObservation, EvidenceUpdate, NonEmptyTuple<Diagnostic>>;
  };
  operation: {
    readonly project: Signature<
      AdmittedEventObservation,
      OperationInvocation,
      NonEmptyTuple<Diagnostic>
    >;
  };
}>;

/** One live subscription: identified, attached to persistent membership, owned once. */
export interface EventSubscription {
  readonly id: ListenerReference;
  readonly membership: RegionMembership;
  readonly target: WebNodeReference;
  readonly descriptor: WebEventDescriptor;
  readonly projection: EventProjection;
  readonly owner: RealizationInstanceReference;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

/** Narrow intrinsic authority to observe browser events at a named target. */
export interface EventFacility {
  readonly observe: Signature<EventObservationRequest, AdmittedEventObservation, NonEmptyTuple<Diagnostic>>;
}

/** The complete request from which one subscription is created. */
export interface EventSubscriptionRequest {
  readonly membership: RegionMembership;
  readonly target: WebNodeReference;
  readonly descriptor: WebEventDescriptor;
  readonly payload: SchemaReference;
  readonly projection: EventProjection;
}

/**
 * The persistent provider the plan actually selects: it creates subscriptions
 * on demand from complete requests. Subscriptions are per-use resources with
 * their own identity and lifecycle, never the plan-level binding itself.
 */
export interface EventSubscriptionAuthority {
  readonly subscribe: Signature<EventSubscriptionRequest, EventSubscription, NonEmptyTuple<Diagnostic>>;
}

export type EventFacilityRequirement = Hole<'liteship.web.event-facility', EventFacility>;
export type EventAuthorityRequirement = Hole<'liteship.web.event-authority', EventSubscriptionAuthority>;

/** Intrinsic grounding: the observation facility derived from event targets. */
export interface EventFacilityGrounding
  extends WebGroundingDefinition<readonly [EventFacilityRequirement], unknown, 'intrinsic', 'unowned'> {
  readonly id: GroundingId<'liteship.web.grounding.event-facility'>;
}

/**
 * Standing up the subscription authority is an offer requiring the
 * observation facility and the persistent region manager its subscriptions'
 * memberships come from — never a frozen transaction lease.
 */
export interface EventAuthorityOffer
  extends WebRealizationOffer<
    readonly [EventAuthorityRequirement],
    readonly [EventFacilityRequirement, RegionAuthorityRequirement],
    unknown,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.web.offer.event-authority'>;
  readonly locations: NonEmptyTuple<'local' | 'live'>;
  readonly backends: NonEmptyTuple<'javascript'>;
}

// ---------------------------------------------------------------------------
// Laws
//
// That replacing a rendered structure disposes its old listeners, and that no
// listener outlives its region membership, are implementation-fixture
// obligations.
// ---------------------------------------------------------------------------

/** Compile-time law: an event projects to evidence or an operation, never a free function. */
export type AnEventProjectsToEvidenceOrAnOperation = Assert<
  Equal<TagOf<EventProjection>, 'evidence' | 'operation'>
>;

/** Compile-time law: the operation projection produces a real invocation. */
export type AnOperationProjectionProducesAnInvocation = Assert<
  Equal<OutputOf<CaseOf<EventProjection, 'operation'>['project']>, OperationInvocation>
>;

/** Compile-time law: the evidence projection produces a core evidence update. */
export type AnEvidenceProjectionProducesAnUpdate = Assert<
  Equal<OutputOf<CaseOf<EventProjection, 'evidence'>['project']>, EvidenceUpdate>
>;

/**
 * Compile-time law: subscribing consumes the complete request — membership,
 * target, descriptor, projection — and produces the owned subscription. A
 * factory input that omitted the target or projection could not faithfully
 * construct what it claims to provide.
 */
export type SubscribingConsumesTheCompleteRequest = Assert<
  Equal<
    [
      InputOf<EventSubscriptionAuthority['subscribe']>,
      EventSubscriptionRequest['target'],
      EventSubscriptionRequest['projection'],
      OutputOf<EventSubscriptionAuthority['subscribe']>,
    ],
    [EventSubscriptionRequest, WebNodeReference, EventProjection, EventSubscription]
  >
>;

/** Compile-time law: a subscription attaches to persistent membership, not a lease. */
export type ASubscriptionAttachesToMembership = Assert<
  Equal<
    [EventSubscription['membership'], 'authority' extends keyof EventSubscription ? true : false],
    [RegionMembership, false]
  >
>;

/** Compile-time law: a subscription knows what it observes and who owns it. */
export type ASubscriptionHasIdentityAndAnOwner = Assert<
  Equal<
    [EventSubscription['descriptor'], EventSubscription['owner'], EventSubscription['lifecycle']],
    [WebEventDescriptor, RealizationInstanceReference, CaseOf<RealizationLifecycle, 'owned'>]
  >
>;

/** Compile-time law: the authority is an offer requiring facility and region manager. */
export type TheAuthorityRequiresFacilityAndManager = Assert<
  Equal<
    [EventAuthorityOffer['requires'], EventAuthorityOffer['id']],
    [
      readonly [EventFacilityRequirement, RegionAuthorityRequirement],
      RealizationOfferId<'liteship.web.offer.event-authority'>,
    ]
  >
>;

/** Compile-time law: observation cannot be constructed without a target and contract. */
export type ObservationRequiresATargetAndContract = Assert<
  Equal<
    [
      InputOf<EventFacility['observe']>,
      EventObservationRequest['target'],
      EventObservationRequest['payload'],
      AdmittedEventObservation['id'],
    ],
    [EventObservationRequest, WebNodeReference, SchemaReference, WebObservationReference]
  >
>;

/** Type summary consumed by the web topology. */
export interface WebEventTypeSurface {
  readonly descriptor: WebEventDescriptor;
  readonly observation: AdmittedEventObservation;
  readonly projection: EventProjection;
  readonly request: EventSubscriptionRequest;
  readonly authority: EventSubscriptionAuthority;
  readonly subscription: EventSubscription;
  readonly facility: EventFacilityGrounding;
  readonly offer: EventAuthorityOffer;
}
