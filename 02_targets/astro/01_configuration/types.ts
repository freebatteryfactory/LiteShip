/**
 * The trust boundary between configuration the ecosystem hands over and
 * configuration this child is willing to act on.
 *
 * Raw configuration arrives unvalidated and undisclosed. Admitted
 * configuration is bound to an exact revision, states its build output, and
 * classifies every field it carries as public or secret. The two are
 * deliberately not interchangeable: a child that accepts raw configuration
 * wherever admitted configuration is required has a validation step that can be
 * deleted without anything turning red.
 *
 * Disclosure is carried, not inferred. A field is secret because it was
 * classified secret, never because a name looked sensitive.
 *
 * @module
 */

import type {
  Algebra,
  Brand,
  NonEmptyTuple,
} from '../../../types.js';
import type { RevisionId } from '../../../00_core/02_identity/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type {
  TargetConfigurationId,
  TargetConfigurationRevision,
} from '../../types.js';

/** A configuration key as written by the application author. */
export type AstroConfigurationKey = Brand<string, 'liteship.target.astro.configuration-key'>;

/**
 * Where a configuration value came from.
 *
 * Kept because provenance changes what a value may be trusted for, and a
 * value's origin is not recoverable once it has been merged into a bag.
 */
export type ConfigurationOrigin = Algebra<{
  'integration-options': Record<never, never>;
  'project-file': Record<never, never>;
  environment: Record<never, never>;
}>;

/**
 * Configuration exactly as the ecosystem hands it over.
 *
 * `contents` is `unknown` on purpose. This is the one place in the child where
 * an unvalidated value is representable, and it is representable only here.
 */
export interface RawAstroConfiguration {
  readonly origin: ConfigurationOrigin;
  readonly contents: unknown;
}

/** Whether a configuration field may cross into browser-visible output. */
export type ConfigurationDisclosure = 'public' | 'secret';

/** One classified configuration field. */
export interface AstroConfigurationField<
  Disclosure extends ConfigurationDisclosure = ConfigurationDisclosure,
> {
  readonly key: AstroConfigurationKey;
  readonly origin: ConfigurationOrigin;
  readonly disclosure: Disclosure;
}

/**
 * Astro's build output mode.
 *
 * Evidence, not architecture: the ecosystem decides the spelling. It is carried
 * because a static build and a server build demand different artifact slots,
 * and a child that cannot tell them apart cannot state its demands exactly.
 */
export type AstroBuildOutput = 'static' | 'server';

/** Configuration this child is willing to act on. */
export interface AdmittedAstroConfiguration<
  Config extends TargetConfigurationId = TargetConfigurationId,
  Revision extends RevisionId = RevisionId,
> {
  readonly configuration: TargetConfigurationRevision<Config, Revision>;
  readonly output: AstroBuildOutput;
  readonly fields: readonly AstroConfigurationField[];
}

/**
 * The admission decision.
 *
 * `malformed` carries no configuration at all. An admission failure that still
 * produced a configuration would let a caller reach past the diagnostics for
 * the value that failed validation.
 */
export type AstroConfigurationAdmission<
  Config extends TargetConfigurationId = TargetConfigurationId,
  Revision extends RevisionId = RevisionId,
> = Algebra<{
  admitted: { readonly configuration: AdmittedAstroConfiguration<Config, Revision> };
  malformed: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

/** The families this home owns, so none is correct and unreached. */
export interface AstroConfigurationTypeSurface {
  readonly raw: RawAstroConfiguration;
  readonly origin: ConfigurationOrigin;
  readonly field: AstroConfigurationField;
  readonly admitted: AdmittedAstroConfiguration;
  readonly admission: AstroConfigurationAdmission;
}
