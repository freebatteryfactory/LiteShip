/**
 * Compile-time laws for `02_targets/astro/01_configuration`.
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
import type { Address, Assert, CaseOf, Equal, NonEmptyTuple } from '../../../types.js';
import type { TargetConfigurationId, TargetConfigurationRevision } from '../../types.js';
import type { AdmittedAstroConfiguration, AstroConfigurationAdmission, AstroConfigurationField, RawAstroConfiguration } from './types.js';

// ---------------------------------------------------------------------------
// Laws

type LawConfig = TargetConfigurationId<'astro.build'>;

type LawRevisionA = Address<
  'liteship.content:application/vnd.liteship.revision+cbor',
  'sha256:1111111111111111111111111111111111111111111111111111111111111111'
>;

type LawRevisionB = Address<
  'liteship.content:application/vnd.liteship.revision+cbor',
  'sha256:2222222222222222222222222222222222222222222222222222222222222222'
>;


/**
 * Compile-time law: raw configuration cannot stand in for admitted
 * configuration, in either direction.
 *
 * Both directions are checked because a one-directional test passes when the
 * two collapse into one type.
 */
export type RawConfigurationIsNotAdmitted = Assert<
  Equal<
    [
      RawAstroConfiguration extends AdmittedAstroConfiguration ? true : false,
      AdmittedAstroConfiguration extends RawAstroConfiguration ? true : false,
    ],
    [false, false]
  >
>;


/**
 * Compile-time law: admitted configuration pins an exact revision, and two
 * revisions of one configuration are not interchangeable.
 */
export type AdmittedConfigurationPinsItsExactRevision = Assert<
  Equal<
    [
      AdmittedAstroConfiguration<LawConfig, LawRevisionA>['configuration'],
      AdmittedAstroConfiguration<LawConfig, LawRevisionA> extends AdmittedAstroConfiguration<
        LawConfig,
        LawRevisionB
      >
        ? true
        : false,
    ],
    [TargetConfigurationRevision<LawConfig, LawRevisionA>, false]
  >
>;


/**
 * Compile-time law: a malformed admission carries diagnostics and no configuration.
 *
 * The diagnostic check is a nested `Equal` rather than the arm type itself:
 * `CaseOf<…>['x']` is deferred inside a tuple and reports two identical types as
 * unequal. Booleans resolve eagerly and keep identity semantics.
 */
export type AMalformedAdmissionCarriesNoConfiguration = Assert<
  Equal<
    [
      'configuration' extends keyof CaseOf<AstroConfigurationAdmission, 'malformed'> ? true : false,
      Equal<CaseOf<AstroConfigurationAdmission, 'malformed'>['diagnostics'], NonEmptyTuple<Diagnostic>>,
    ],
    [false, true]
  >
>;


/**
 * Compile-time law: disclosure is exact on the field that carries it.
 *
 * A secret field must not be assignable where a public field is required. If
 * the parameter stops being read, both instantiations collapse to the union and
 * the assignability check flips.
 */
export type ASecretFieldIsNotAPublicField = Assert<
  Equal<
    AstroConfigurationField<'secret'> extends AstroConfigurationField<'public'> ? true : false,
    false
  >
>;
