/**
 * Compile-time laws for `02_targets/vite/00_integration`.
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

import type { RevisionId } from '../../../00_core/02_identity/types.js';
import type { Assert, CaseOf, Equal, NonEmptyTuple } from '../../../types.js';
import type { EcosystemTargetId, TargetConfigurationId, TargetParticipation } from '../../types.js';
import type { BuildEnvironmentName, ViteCompatibility, VitePluginDefinition, VitePluginId } from './types.js';

// ---------------------------------------------------------------------------
// Laws

type LawPlugin = VitePluginId<'liteship'>;

type LawConfig = TargetConfigurationId<'vite.build'>;

type LawRevision = RevisionId;


/** Compile-time law: this child names the Vite ecosystem target and no other. */
export type TheDefinitionNamesTheViteTargetExactly = Assert<
  Equal<
    VitePluginDefinition<LawPlugin, LawConfig, LawRevision>['participation'],
    TargetParticipation<EcosystemTargetId<'vite'>, LawConfig, LawRevision>
  >
>;


/**
 * Compile-time law: applicability is non-empty, so universal activation cannot
 * be spelled as an omission.
 *
 * The second clause is what carries the weight: a plain readonly array would
 * accept `[]`, and `[]` is exactly the absent declaration this law exists to
 * forbid.
 */
export type ApplicabilityIsAlwaysDeclared = Assert<
  Equal<
    [
      Equal<VitePluginDefinition['environments'], NonEmptyTuple<BuildEnvironmentName>>,
      readonly [] extends VitePluginDefinition['environments'] ? true : false,
    ],
    [true, false]
  >
>;


/** Compile-time law: compatibility keeps its four altitudes distinct. */
export type ViteCompatibilityKeepsItsFourAltitudes = Assert<
  Equal<ViteCompatibility['_tag'], 'supported' | 'degraded' | 'refused' | 'unavailable'>
>;


/** Compile-time law: absent evidence is not support. */
export type ViteAbsentEvidenceIsNotSupport = Assert<
  Equal<
    [
      'evidence' extends keyof CaseOf<ViteCompatibility, 'unavailable'> ? true : false,
      'evidence' extends keyof CaseOf<ViteCompatibility, 'refused'> ? true : false,
      'limitations' extends keyof CaseOf<ViteCompatibility, 'supported'> ? true : false,
    ],
    [false, false, false]
  >
>;
