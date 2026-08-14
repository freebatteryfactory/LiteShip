/**
 * Compile-time laws for `01_hosts/web/03_event`.
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

import type { SchemaReference } from '../../../00_core/03_schema/types.js';
import type { EvidenceUpdate } from '../../../00_core/06_evidence/types.js';
import type { OperationInvocation } from '../../../00_core/07_operation/types.js';
import type { RealizationInstanceReference, RealizationLifecycle, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { Assert, CaseOf, Equal, InputOf, OutputOf, TagOf } from '../../../types.js';
import type { RegionAuthorityRequirement, RegionMembership, WebNodeReference } from '../01_region/types.js';
import type { AdmittedEventObservation, EventAuthorityOffer, EventFacility, EventFacilityRequirement, EventObservationRequest, EventProjection, EventSubscription, EventSubscriptionAuthority, EventSubscriptionRequest, WebEventDescriptor, WebObservationReference } from './types.js';

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
