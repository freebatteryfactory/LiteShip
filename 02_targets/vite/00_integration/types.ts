/**
 * Vite target identity, registration, and — required, not optional —
 * environment applicability.
 *
 * Vite 8 activates a plugin in every environment when applicability is not
 * declared, and a host may construct several: a client environment, a server
 * one, a prerender one, a framework one. A projection that does not say where
 * it applies is therefore not "unscoped"; it is scoped to everything, which is
 * a decision nobody made.
 *
 * So applicability is a non-empty member of this child's identity. There is no
 * spelling for "applies nowhere in particular".
 *
 * Bundler and tooling versions are compatibility evidence, restated as the
 * ecosystem moves. This home names no hook, no bundler, and no version as a
 * semantic constant.
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
  Reference,
} from '../../../types.js';
import type { ContentAddress } from '../../../00_core/01_encoding/types.js';
import type { RevisionId } from '../../../00_core/02_identity/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type {
  EcosystemTargetId,
  TargetConfigurationId,
  TargetParticipation,
} from '../../types.js';

export type VitePluginId<Name extends string = string> = Brand<Name, 'liteship.target.vite.plugin-id'>;
export type VitePluginReference<Id extends VitePluginId = VitePluginId> = Reference<'vite-plugin', Id>;

/** The one ecosystem target this child is. */
export type ViteTargetId = EcosystemTargetId<'vite'>;

/**
 * One build environment, named by the host that constructed it.
 *
 * Opaque. This child does not enumerate environment names, because the host
 * decides how many exist and what they are called.
 */
export type BuildEnvironmentName = Brand<string, 'liteship.target.vite.environment-name'>;

/**
 * Where a projection applies. Non-empty by construction.
 *
 * The empty case is not "no opinion" — it is the absent declaration that makes
 * a plugin universal. Making it unrepresentable is the whole point.
 */
export type EnvironmentApplicability = NonEmptyTuple<BuildEnvironmentName>;

/** Address of one recorded Vite compatibility observation. Distinct from Astro's. */
export type ViteCompatibilityEvidence =
  ContentAddress<'application/vnd.liteship.vite-compatibility+cbor'>;

/** What this child can honestly claim about a bundler and tooling generation. */
export type ViteCompatibility = Algebra<{
  supported: { readonly evidence: ViteCompatibilityEvidence };
  degraded: {
    readonly evidence: ViteCompatibilityEvidence;
    readonly limitations: NonEmptyTuple<Diagnostic>;
  };
  refused: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  unavailable: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
}>;

/** One registration bound to one exact target configuration revision. */
export interface VitePluginDefinition<
  Plugin extends VitePluginId = VitePluginId,
  Config extends TargetConfigurationId = TargetConfigurationId,
  Revision extends RevisionId = RevisionId,
> {
  readonly plugin: VitePluginReference<Plugin>;
  readonly participation: TargetParticipation<ViteTargetId, Config, Revision>;
  readonly environments: EnvironmentApplicability;
  readonly compatibility: ViteCompatibility;
}

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

/** The families this home owns, so none is correct and unreached. */
export interface ViteIntegrationTypeSurface {
  readonly plugin: VitePluginReference;
  readonly target: ViteTargetId;
  readonly environment: BuildEnvironmentName;
  readonly applicability: EnvironmentApplicability;
  readonly compatibility: ViteCompatibility;
  readonly definition: VitePluginDefinition;
}
