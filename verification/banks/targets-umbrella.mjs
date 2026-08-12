// The shared target umbrella.
//
// Written alongside the contract rather than after it. Each entry restores one
// way the umbrella could grow back into the thing it refuses to be: a second
// artifact vocabulary, a universal lifecycle, a context object with the label
// filed off, or a fact duplicated into two places that then need a parity law.

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

  // --- participation exactness --------------------------------------------
  ['participation decorrelates its composition', T,
    `  readonly composition: TargetCompositionReference<Composition>;
}

// ---------------------------------------------------------------------------
// 4. Production`,
    `  readonly composition: TargetCompositionReference;
}

// ---------------------------------------------------------------------------
// 4. Production`],

  ['participation decorrelates its configuration', T,
    `  readonly configuration: TargetConfigurationRevision<Config, Revision>;`,
    `  readonly configuration: TargetConfigurationRevision<Config>;`],

  ['the configuration revision widens back to broad', T,
    `  readonly revision: RevisionReference<Revision>;`,
    `  readonly revision: RevisionReference;`],

  // --- the umbrella grows luggage -----------------------------------------
  ...[
    ['a named target member', `  readonly astro?: unknown;`],
    ['an anonymous payload', `  readonly payload?: unknown;`],
    ['a context bag', `  readonly context?: unknown;`],
    ['a hook table', `  readonly hooks?: unknown;`],
    ['a universal lifecycle phase', `  readonly phase?: 'configuration' | 'discovery' | 'transform' | 'render' | 'deploy';`],
  ].map(([what, line]) => [`the umbrella grows ${what}`, T,
    `  readonly target: EcosystemTargetReference<Target>;
  readonly configuration: TargetConfigurationRevision<Config, Revision>;`,
    `  readonly target: EcosystemTargetReference<Target>;
${line}
  readonly configuration: TargetConfigurationRevision<Config, Revision>;`]),

  // --- second artifact vocabulary ------------------------------------------
  ...[
    ['the content address', 'address'],
    ['the digest', 'digest'],
    ['the media type', 'mediaType'],
    ['the source relation', 'relation'],
    ['a source map', 'sourceMap'],
  ].map(([what, key]) => [`the production relation restates ${what}`, T,
    `  readonly artifact: Artifact<Id, Target, Revision>;
  readonly producer: Producer;`,
    `  readonly artifact: Artifact<Id, Target, Revision>;
  readonly ${key}: ArtifactSlotReference;
  readonly producer: Producer;`]),

  ['the production relation stops binding a core artifact', T,
    `  readonly artifact: Artifact<Id, Target, Revision>;
  readonly producer: Producer;`,
    `  readonly artifact: ArtifactSlotReference;
  readonly producer: Producer;`],

  // --- duplicated facts ----------------------------------------------------
  ['a sibling configuration returns beside the producer', T,
    `  readonly artifact: Artifact<Id, Target, Revision>;
  readonly producer: Producer;`,
    `  readonly artifact: Artifact<Id, Target, Revision>;
  readonly configuration: TargetConfigurationRevision;
  readonly producer: Producer;`],

  ['a sibling composition returns beside the producer', T,
    `  readonly artifact: Artifact<Id, Target, Revision>;
  readonly producer: Producer;`,
    `  readonly artifact: Artifact<Id, Target, Revision>;
  readonly composition: TargetCompositionReference;
  readonly producer: Producer;`],

  ['failure regains its duplicate composition', T,
    `export interface TargetFailure<Target extends EcosystemTargetId = EcosystemTargetId> {
  readonly target: EcosystemTargetReference<Target>;`,
    `export interface TargetFailure<Target extends EcosystemTargetId = EcosystemTargetId> {
  readonly target: EcosystemTargetReference<Target>;
  readonly composition: TargetCompositionReference;`],

  // --- slot exactness ------------------------------------------------------
  ['the artifact slot widens', T,
    `  readonly slot: ArtifactSlotReference<Slot>;`,
    `  readonly slot: ArtifactSlotReference;`],

  // --- direct mode ---------------------------------------------------------
  ['the direct arm acquires an ecosystem target', T,
    `  'direct-composition': {
    readonly composition: TargetCompositionReference<Composition>;
  };`,
    `  'direct-composition': {
    readonly composition: TargetCompositionReference<Composition>;
    readonly target: EcosystemTargetReference<Target>;
  };`],

  ['the direct arm acquires a target configuration', T,
    `  'direct-composition': {
    readonly composition: TargetCompositionReference<Composition>;
  };`,
    `  'direct-composition': {
    readonly composition: TargetCompositionReference<Composition>;
    readonly configuration: TargetConfigurationRevision<Config, Revision>;
  };`],

  ['target production stops reusing exact participation', T,
    `  'ecosystem-target': {
    readonly participation: TargetParticipation<Target, Config, Composition, Revision>;
  };`,
    `  'ecosystem-target': {
    readonly participation: TargetParticipation;
  };`],

  // --- rejection and failure -----------------------------------------------
  ['ambiguous claimants narrow back to ecosystem targets', T,
    `    readonly claimants: NonEmptyTuple<ArtifactProducer>;`,
    `    readonly claimants: NonEmptyTuple<EcosystemTargetReference>;`],

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
