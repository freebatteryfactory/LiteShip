/**
 * Compile-time laws for `01_hosts/server/06_service`.
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

import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { OperationInvocation } from '../../../00_core/07_operation/types.js';
import type { RealizationLifecycle } from '../../../00_core/14_compiler/types.js';
import type { Assert, CaseOf, Equal, NonEmptyTuple, TagOf } from '../../../types.js';
import type { RestartPolicy, ServiceHealth, ServiceInstance, ServiceRequest } from './types.js';

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
