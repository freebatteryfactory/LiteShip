/**
 * Compile-time laws for `02_targets/cloudflare/01_configuration`.
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
import type { TargetConfigurationId, TargetConfigurationRevision } from '../../types.js';
import type { AdmittedCloudflareConfiguration, CloudflareConfigurationAdmission, CompatibilityDate, RawCloudflareConfiguration } from './types.js';

// ---------------------------------------------------------------------------
// Laws

type LawConfig = TargetConfigurationId<'cloudflare.deploy'>;

type LawRevision = RevisionId;


/** Compile-time law: raw configuration cannot stand in for admitted, in either direction. */
export type RawCloudflareConfigurationIsNotAdmitted = Assert<
  Equal<
    [
      RawCloudflareConfiguration extends AdmittedCloudflareConfiguration ? true : false,
      AdmittedCloudflareConfiguration extends RawCloudflareConfiguration ? true : false,
    ],
    [false, false]
  >
>;


/** Compile-time law: admitted configuration pins an exact revision. */
export type AdmittedCloudflareConfigurationPinsItsRevision = Assert<
  Equal<
    AdmittedCloudflareConfiguration<LawConfig, LawRevision>['configuration'],
    TargetConfigurationRevision<LawConfig, LawRevision>
  >
>;


/**
 * Compile-time law: the compatibility date is required and is not a bare string.
 *
 * Optionality is the escape. Under `exactOptionalPropertyTypes` an optional
 * member admits `undefined`, and a deployment with no stated runtime generation
 * silently inherits whatever the platform means at deploy time.
 */
export type TheCompatibilityDateIsRequiredAndBranded = Assert<
  Equal<
    [
      Equal<AdmittedCloudflareConfiguration['compatibilityDate'], CompatibilityDate>,
      undefined extends AdmittedCloudflareConfiguration['compatibilityDate'] ? true : false,
      string extends AdmittedCloudflareConfiguration['compatibilityDate'] ? true : false,
    ],
    [true, false, false]
  >
>;


/** Compile-time law: a malformed admission carries diagnostics and no configuration. */
export type AMalformedCloudflareAdmissionCarriesNoConfiguration = Assert<
  Equal<
    [
      'configuration' extends keyof CaseOf<CloudflareConfigurationAdmission, 'malformed'> ? true : false,
      Equal<CaseOf<CloudflareConfigurationAdmission, 'malformed'>['diagnostics'], NonEmptyTuple<Diagnostic>>,
    ],
    [false, true]
  >
>;
