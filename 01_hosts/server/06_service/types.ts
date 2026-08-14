/**
 * Long-lived services: repeatable supervised resources, not a container.
 *
 * This home owns service-provider authority and repeatable service
 * resources: identity, configuration address, readiness and health evidence,
 * supervision and restart policy shape, graceful drain, shutdown,
 * withdrawal, and disposal. It is not a universal dependency-injection
 * container and carries no hidden global-singleton assumption — two services
 * are two owned resources with two lifecycles.
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
  NonEmptyTuple,
  Reference,
  Signature,
  TagOf,
} from '../../../types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { MonotonicNanoseconds } from '../../../00_core/04_time/types.js';
import type { OperationInvocation } from '../../../00_core/07_operation/types.js';
import type { RealizationLifecycle, RealizationOfferId } from '../../../00_core/14_compiler/types.js';
import type { ServerRealizationOffer } from '../00_bootstrap/types.js';
import type { ProcessAuthorityRequirement } from '../01_process/types.js';

export type ServiceId<Name extends string = string> = Brand<Name, 'liteship.server.service-id'>;
export type ServiceReference<Id extends ServiceId = ServiceId> = Reference<'server-service', Id>;

/** Readiness and health, phase-correct: starting is not ready; unhealthy is not gone. */
export type ServiceHealth = Algebra<{
  starting: Record<never, never>;
  ready: { readonly since: MonotonicNanoseconds };
  unhealthy: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  draining: Record<never, never>;
  stopped: { readonly receipt: ContentAddress<'application/vnd.liteship.server-service-stop+cbor'> };
  withdrawn: Record<never, never>;
}>;

/** Restart policy shape — never a numeric constant. */
export type RestartPolicy = Algebra<{
  never: Record<never, never>;
  restart: Record<never, never>;
  replan: Record<never, never>;
}>;

/**
 * One live service: configuration-addressed, health-observable, drainable,
 * and owned. Draining is the graceful path; stop mints the receipt.
 */
export interface ServiceInstance {
  readonly id: ServiceReference;
  readonly configuration: ContentAddress<'application/vnd.liteship.server-service-configuration+cbor'>;
  readonly owns: NonEmptyTuple<OperationInvocation>;
  readonly health: ServiceHealth;
  readonly policy: RestartPolicy;
  readonly drain: Signature<ServiceReference, ServiceReference, NonEmptyTuple<Diagnostic>>;
  readonly stop: Signature<
    ServiceReference,
    ContentAddress<'application/vnd.liteship.server-service-stop+cbor'>,
    NonEmptyTuple<Diagnostic>
  >;
  readonly lifecycle: CaseOf<RealizationLifecycle, 'owned'>;
}

/** The complete construction request: configuration and policy together. */
export interface ServiceRequest {
  readonly configuration: ServiceInstance['configuration'];
  readonly owns: NonEmptyTuple<OperationInvocation>;
  readonly policy: RestartPolicy;
}

/** The service provider: services are repeatable per-use resources it supervises. */
export interface ServiceAuthority {
  readonly construct: Signature<ServiceRequest, ServiceInstance, NonEmptyTuple<Diagnostic>>;
}

export type ServiceRequirement = Hole<'liteship.server.service', ServiceAuthority>;

/** Constructing the service provider over the admitted host process. */
export interface ServiceAuthorityOffer
  extends ServerRealizationOffer<
    readonly [ServiceRequirement],
    readonly [ProcessAuthorityRequirement],
    unknown,
    unknown,
    'owned'
  > {
  readonly id: RealizationOfferId<'liteship.server.offer.service-authority'>;
  readonly locations: NonEmptyTuple<'local' | 'live'>;
  readonly backends: NonEmptyTuple<'javascript'>;
}

// ---------------------------------------------------------------------------
// Laws
//
// Actual readiness, drain, restart, and shutdown behavior matching the
// declared lifecycle is `system/assurance`; intervals and backoff are
// empirical.
// ---------------------------------------------------------------------------

/** Compile-time law: the health arms are phase-correct with their evidence. */
export type HealthIsPhaseCorrect = Assert<
  Equal<
    [
      TagOf<ServiceHealth>,
      CaseOf<ServiceHealth, 'unhealthy'>['diagnostics'],
      CaseOf<ServiceHealth, 'stopped'>['receipt'],
    ],
    [
      'starting' | 'ready' | 'unhealthy' | 'draining' | 'stopped' | 'withdrawn',
      NonEmptyTuple<Diagnostic>,
      ContentAddress<'application/vnd.liteship.server-service-stop+cbor'>,
    ]
  >
>;

/** Compile-time law: restart policy is a closed shape without constants. */
export type RestartPolicyIsAClosedShape = Assert<
  Equal<TagOf<RestartPolicy>, 'never' | 'restart' | 'replan'>
>;

/**
 * Compile-time law: a service is configuration-addressed, owns at least one
 * identified unit of work, and is owned — a service-shaped noun that owns
 * nothing is not a service contract.
 */
export type AServiceIsAddressedDrainableAndOwned = Assert<
  Equal<
    [ServiceInstance['configuration'], ServiceInstance['owns'], ServiceRequest['owns'], ServiceInstance['lifecycle']],
    [
      ContentAddress<'application/vnd.liteship.server-service-configuration+cbor'>,
      NonEmptyTuple<OperationInvocation>,
      NonEmptyTuple<OperationInvocation>,
      CaseOf<RealizationLifecycle, 'owned'>,
    ]
  >
>;

/** Type summary consumed by the server topology. */
export interface ServerServiceTypeSurface {
  readonly instance: ServiceInstance;
  readonly health: ServiceHealth;
  readonly authority: ServiceAuthority;
  readonly serviceOffer: ServiceAuthorityOffer;
}
