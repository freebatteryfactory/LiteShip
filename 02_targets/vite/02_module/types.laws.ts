/**
 * Compile-time laws for `02_targets/vite/02_module`.
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
import type { RevisionId, RevisionReference } from '../../../00_core/02_identity/types.js';
import type { Assert, CaseOf, Equal, NonEmptyTuple } from '../../../types.js';
import type { TargetConfigurationId, TargetConfigurationRevision } from '../../types.js';
import type { BuildEnvironmentName } from '../00_integration/types.js';
import type { GeneratedModuleIdentity, GeneratedModuleOutcome, ModuleSpecifier, ResolvedModuleLocation } from './types.js';

// ---------------------------------------------------------------------------
// Laws

type LawConfig = TargetConfigurationId<'vite.build'>;

type LawRevision = RevisionId;


/**
 * Compile-time law: module identity reads the configuration revision.
 *
 * The predecessor's seven fixed strings are exactly the shape this forbids: an
 * identity that does not read its configuration is one identity for every
 * project that ever builds.
 */
export type ModuleIdentityReadsItsConfiguration = Assert<
  Equal<
    GeneratedModuleIdentity<LawConfig, LawRevision>['configuration'],
    TargetConfigurationRevision<LawConfig, LawRevision>
  >
>;


/** Compile-time law: module identity reads the source revision and the environment. */
export type ModuleIdentityReadsItsSourceAndEnvironment = Assert<
  Equal<
    [
      Equal<GeneratedModuleIdentity<LawConfig, LawRevision>['source'], RevisionReference<LawRevision>>,
      Equal<GeneratedModuleIdentity['environment'], BuildEnvironmentName>,
    ],
    [true, true]
  >
>;


/**
 * Compile-time law: the public specifier is not the semantic identity.
 *
 * Both directions. If a specifier were assignable to an identity, the friendly
 * name could be passed wherever the real thing is required and the whole
 * separation would be decorative.
 */
export type TheSpecifierIsNotTheIdentity = Assert<
  Equal<
    [
      ModuleSpecifier extends GeneratedModuleIdentity ? true : false,
      GeneratedModuleIdentity extends ModuleSpecifier ? true : false,
    ],
    [false, false]
  >
>;


/**
 * Compile-time law: empty and unresolved are different answers.
 *
 * `genuinely-empty` carries an identity, so it is a real result about a real
 * module. `unresolved` carries diagnostics and no identity, so it cannot be
 * mistaken for one.
 */
export type EmptyAndUnresolvedAreDifferentAnswers = Assert<
  Equal<
    [
      Equal<GeneratedModuleOutcome['_tag'], 'generated' | 'genuinely-empty' | 'unresolved'>,
      'identity' extends keyof CaseOf<GeneratedModuleOutcome, 'unresolved'> ? true : false,
      Equal<CaseOf<GeneratedModuleOutcome, 'unresolved'>['diagnostics'], NonEmptyTuple<Diagnostic>>,
    ],
    [true, false, true]
  >
>;


/**
 * Compile-time law: a resolved location is not an identity.
 *
 * `getFileName` and friends return where the bundler put something. Persistent
 * identity is this home's, and a location must not be able to stand in for it.
 */
export type AResolvedLocationIsNotAnIdentity = Assert<
  Equal<ResolvedModuleLocation extends GeneratedModuleIdentity ? true : false, false>
>;
