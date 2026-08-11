// The shared target umbrella.
//
// Written alongside the contract rather than after it. Each entry restores one
// way the umbrella could grow back into the thing it refuses to be: a second
// artifact vocabulary, a universal lifecycle, or a context object with the
// label filed off.

import { runBank } from '../harness.mjs';

const T = '02_targets/types.ts';

const M = [
  // --- identity ------------------------------------------------------------
  ['ecosystem target reference goes back to broad', T,
    `export type EcosystemTargetReference<Id extends EcosystemTargetId = EcosystemTargetId> = Reference<
  'ecosystem-target',
  Id
>;`,
    `export type EcosystemTargetReference = Reference<'ecosystem-target', EcosystemTargetId>;`],

  ['ecosystem target adopts the compiler projection brand', T,
    `export type EcosystemTargetId<Name extends string = string> = Brand<Name, 'liteship.ecosystem-target-id'>;`,
    `export type EcosystemTargetId<Name extends string = string> = Brand<Name, 'liteship.projection-target-id'>;`],

  // --- participation -------------------------------------------------------
  ['participation decorrelates its composition', T,
    `  readonly composition: TargetCompositionReference<Composition>;
}

// ---------------------------------------------------------------------------
// 4. Production`,
    `  readonly composition: TargetCompositionReference;
}

// ---------------------------------------------------------------------------
// 4. Production`],

  ['participation decorrelates its configuration revision', T,
    `  readonly configuration: TargetConfigurationRevision<Config, Revision>;`,
    `  readonly configuration: TargetConfigurationRevision;`],

  // --- the umbrella grows luggage -----------------------------------------
  ['the umbrella grows a named target member', T,
    `  readonly target: EcosystemTargetReference<Target>;
  readonly configuration: TargetConfigurationRevision<Config, Revision>;`,
    `  readonly target: EcosystemTargetReference<Target>;
  readonly astro?: unknown;
  readonly configuration: TargetConfigurationRevision<Config, Revision>;`],

  ['the umbrella grows an anonymous payload', T,
    `  readonly target: EcosystemTargetReference<Target>;
  readonly configuration: TargetConfigurationRevision<Config, Revision>;`,
    `  readonly target: EcosystemTargetReference<Target>;
  readonly payload?: unknown;
  readonly configuration: TargetConfigurationRevision<Config, Revision>;`],

  ['the umbrella grows a context bag', T,
    `  readonly target: EcosystemTargetReference<Target>;
  readonly configuration: TargetConfigurationRevision<Config, Revision>;`,
    `  readonly target: EcosystemTargetReference<Target>;
  readonly context?: unknown;
  readonly configuration: TargetConfigurationRevision<Config, Revision>;`],

  ['the umbrella grows a hook table', T,
    `  readonly target: EcosystemTargetReference<Target>;
  readonly configuration: TargetConfigurationRevision<Config, Revision>;`,
    `  readonly target: EcosystemTargetReference<Target>;
  readonly hooks?: unknown;
  readonly configuration: TargetConfigurationRevision<Config, Revision>;`],

  ['the umbrella grows a universal lifecycle phase', T,
    `  readonly target: EcosystemTargetReference<Target>;
  readonly configuration: TargetConfigurationRevision<Config, Revision>;`,
    `  readonly target: EcosystemTargetReference<Target>;
  readonly phase?: 'configuration' | 'discovery' | 'transform' | 'render' | 'deploy';
  readonly configuration: TargetConfigurationRevision<Config, Revision>;`],

  // --- second artifact vocabulary ------------------------------------------
  ['the production relation restates the content address', T,
    `  readonly artifact: Artifact<Id, Target, Revision>;
  readonly producer: ArtifactProducer<Producer>;`,
    `  readonly artifact: Artifact<Id, Target, Revision>;
  readonly address: ArtifactSlotReference;
  readonly producer: ArtifactProducer<Producer>;`],

  ['the production relation restates the digest', T,
    `  readonly artifact: Artifact<Id, Target, Revision>;
  readonly producer: ArtifactProducer<Producer>;`,
    `  readonly artifact: Artifact<Id, Target, Revision>;
  readonly digest: ArtifactSlotReference;
  readonly producer: ArtifactProducer<Producer>;`],

  ['the production relation restates the source relation', T,
    `  readonly artifact: Artifact<Id, Target, Revision>;
  readonly producer: ArtifactProducer<Producer>;`,
    `  readonly artifact: Artifact<Id, Target, Revision>;
  readonly relation: ArtifactSlotReference;
  readonly producer: ArtifactProducer<Producer>;`],

  ['the production relation reintroduces a source map', T,
    `  readonly artifact: Artifact<Id, Target, Revision>;
  readonly producer: ArtifactProducer<Producer>;`,
    `  readonly artifact: Artifact<Id, Target, Revision>;
  readonly sourceMap: ArtifactSlotReference;
  readonly producer: ArtifactProducer<Producer>;`],

  ['the production relation stops binding a core artifact', T,
    `  readonly artifact: Artifact<Id, Target, Revision>;
  readonly producer: ArtifactProducer<Producer>;`,
    `  readonly artifact: ArtifactSlotReference;
  readonly producer: ArtifactProducer<Producer>;`],

  // --- direct mode ---------------------------------------------------------
  ['the direct arm acquires an ecosystem target', T,
    `  'direct-composition': { readonly composition: TargetCompositionReference };`,
    `  'direct-composition': {
    readonly composition: TargetCompositionReference;
    readonly target: EcosystemTargetReference;
  };`],

  // --- phase correctness ---------------------------------------------------
  ['a refused outcome carries production', T,
    `    refused: {
      readonly composition: TargetCompositionReference<Composition>;
      readonly rejection: TargetRejection;
    };`,
    `    refused: {
      readonly composition: TargetCompositionReference<Composition>;
      readonly rejection: TargetRejection;
      readonly produced: readonly ProducedArtifact[];
    };`],

  ['a failed outcome reports a preselection rejection', T,
    `    failed: {
      readonly composition: TargetCompositionReference<Composition>;
      readonly failure: TargetFailure;
    };`,
    `    failed: {
      readonly composition: TargetCompositionReference<Composition>;
      readonly rejection: TargetRejection;
      readonly failure: TargetFailure;
    };`],

  ['a composed outcome admits no participants', T,
    `      readonly participants: NonEmptyTuple<TargetParticipation>;`,
    `      readonly participants: readonly TargetParticipation[];`],
];

process.exit(runBank('targets-umbrella', M).clean ? 0 : 1);
