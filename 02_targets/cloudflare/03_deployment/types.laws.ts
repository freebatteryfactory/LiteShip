/**
 * Compile-time laws for `02_targets/cloudflare/03_deployment`.
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
import type { RevisionId } from '../../../00_core/02_identity/types.js';
import type { Assert, CaseOf, Equal, NonEmptyTuple } from '../../../types.js';
import type { DeployableApplication, TargetConfigurationId, TargetParticipation } from '../../types.js';
import type { CloudflareTargetId } from '../00_integration/types.js';
import type { AdmittedCloudflareConfiguration } from '../01_configuration/types.js';
import type { DeploymentOutcome, DeploymentRequest } from './types.js';

// ---------------------------------------------------------------------------
// Laws

type LawConfig = TargetConfigurationId<'cloudflare.deploy'>;

type LawRevision = RevisionId;


/**
 * Compile-time law: a deployment consumes the umbrella's application whole.
 *
 * Written against the imported authority, so a local twin fails even though the
 * compiler would treat the two shapes as one type.
 */
export type ADeploymentConsumesTheUmbrellaApplication = Assert<
  Equal<DeploymentRequest['application'], DeployableApplication>
>;


/**
 * Compile-time law: a deployment cannot ask which producer was involved.
 *
 * This is the direct-mode acceptance test as a type. Every one of these keys
 * would give a consumer something to branch on, and the moment one exists,
 * `withoutAstro` becomes expressible.
 */
export type ADeploymentCannotAskWhoProduced = Assert<
  Equal<
    [
      'astro' extends keyof DeploymentRequest ? true : false,
      'framework' extends keyof DeploymentRequest ? true : false,
      'producer' extends keyof DeploymentRequest ? true : false,
      'direct' extends keyof DeploymentRequest ? true : false,
      'outputMode' extends keyof DeploymentRequest ? true : false,
      'middleware' extends keyof DeploymentRequest ? true : false,
    ],
    [false, false, false, false, false, false]
  >
>;


/** Compile-time law: a deployment pins its exact participation and configuration. */
export type ADeploymentPinsItsExactAxes = Assert<
  Equal<
    [
      Equal<
        DeploymentRequest<LawConfig, LawRevision>['participation'],
        TargetParticipation<CloudflareTargetId, LawConfig, LawRevision>
      >,
      Equal<
        DeploymentRequest<LawConfig, LawRevision>['configuration'],
        AdmittedCloudflareConfiguration<LawConfig, LawRevision>
      >,
    ],
    [true, true]
  >
>;


/**
 * Compile-time law: refusal precedes the attempt, failure follows it, and
 * neither reports a deployment.
 */
export type RefusalAndFailureReportNoDeployment = Assert<
  Equal<
    [
      Equal<DeploymentOutcome['_tag'], 'deployed' | 'refused' | 'failed'>,
      'request' extends keyof CaseOf<DeploymentOutcome, 'refused'> ? true : false,
      'request' extends keyof CaseOf<DeploymentOutcome, 'failed'> ? true : false,
      'bindings' extends keyof CaseOf<DeploymentOutcome, 'failed'> ? true : false,
    ],
    [true, false, false, false]
  >
>;


/** Compile-time law: a refused or failed deployment says why. */
export type ABrokenDeploymentExplainsItself = Assert<
  Equal<
    [
      Equal<CaseOf<DeploymentOutcome, 'refused'>['diagnostics'], NonEmptyTuple<Diagnostic>>,
      Equal<CaseOf<DeploymentOutcome, 'failed'>['diagnostics'], NonEmptyTuple<Diagnostic>>,
    ],
    [true, true]
  >
>;
