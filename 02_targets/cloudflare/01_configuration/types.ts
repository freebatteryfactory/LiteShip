/**
 * The trust boundary from platform-facing configuration to configuration this
 * child will act on, plus the two axes a deployment cannot be described
 * without: which runtime generation it targets, and where it answers.
 *
 * A compatibility date is not decoration. It selects platform behaviour, so a
 * deployment that does not carry one is not "using the default" — it is using
 * whatever the platform happens to mean today, which is a different program
 * next month.
 *
 * @module
 */

import type {
  Algebra,
  Assert,
  Brand,
  CaseOf,
  Equal,
  NonEmptyTuple,
} from '../../../types.js';
import type { RevisionId } from '../../../00_core/02_identity/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type {
  TargetConfigurationId,
  TargetConfigurationRevision,
} from '../../types.js';

/** A platform runtime generation selector. */
export type CompatibilityDate = Brand<string, 'liteship.target.cloudflare.compatibility-date'>;

/** One opt-in platform behaviour flag. */
export type CompatibilityFlag = Brand<string, 'liteship.target.cloudflare.compatibility-flag'>;

/** One place a deployment answers. Opaque: this child does not parse or rank routes. */
export type DeploymentRoute = Brand<string, 'liteship.target.cloudflare.deployment-route'>;

/** Configuration exactly as the platform tooling hands it over. */
export interface RawCloudflareConfiguration {
  readonly contents: unknown;
}

/** Configuration this child will act on. */
export interface AdmittedCloudflareConfiguration<
  Config extends TargetConfigurationId = TargetConfigurationId,
  Revision extends RevisionId = RevisionId,
> {
  readonly configuration: TargetConfigurationRevision<Config, Revision>;
  readonly compatibilityDate: CompatibilityDate;
  readonly flags: readonly CompatibilityFlag[];
  readonly routes: readonly DeploymentRoute[];
}

/** The admission decision. */
export type CloudflareConfigurationAdmission<
  Config extends TargetConfigurationId = TargetConfigurationId,
  Revision extends RevisionId = RevisionId,
> = Algebra<{
  admitted: { readonly configuration: AdmittedCloudflareConfiguration<Config, Revision> };
  malformed: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

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

/** The families this home owns, so none is correct and unreached. */
export interface CloudflareConfigurationTypeSurface {
  readonly date: CompatibilityDate;
  readonly flag: CompatibilityFlag;
  readonly route: DeploymentRoute;
  readonly raw: RawCloudflareConfiguration;
  readonly admitted: AdmittedCloudflareConfiguration;
  readonly admission: CloudflareConfigurationAdmission;
}
