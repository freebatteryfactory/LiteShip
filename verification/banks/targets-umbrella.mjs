// The shared target umbrella.
//
// Written alongside the contract rather than after it. Each entry restores one
// way the umbrella could grow back into the thing it refuses to be: a second
// artifact vocabulary, a universal lifecycle, a context object with the label
// filed off, a fact duplicated into two places, or a coordinate used at the
// wrong altitude.

import { runBank } from '../harness.mjs';

const T = '02_targets/types.ts';

const LUGGAGE = [
  ['a named target member', `  readonly astro?: unknown;`],
  ['an anonymous payload', `  readonly payload?: unknown;`],
  ['a context bag', `  readonly context?: unknown;`],
  ['a hook table', `  readonly hooks?: unknown;`],
  ['a universal lifecycle phase', `  readonly phase?: 'configuration' | 'discovery' | 'transform' | 'render' | 'deploy';`],
];

const RESTATED = [
  ['the content address', 'address'],
  ['the digest', 'digest'],
  ['the media type', 'mediaType'],
  ['the source relation', 'relation'],
  ['a source map', 'sourceMap'],
  ['the configuration', 'configuration'],
  ['the composition', 'composition'],
];

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

  ['the attempt identity collapses into the composition identity', T,
    `export type TargetAttemptReference<Id extends TargetAttemptId = TargetAttemptId> = Reference<
  'target-attempt',
  Id
>;`,
    `export type TargetAttemptReference<Id extends TargetAttemptId = TargetAttemptId> = Reference<
  'target-composition',
  Id
>;`],

  // --- participation exactness --------------------------------------------
  ['participation decorrelates its configuration', T,
    `  readonly configuration: TargetConfigurationRevision<Config, Revision>;
}

// ---------------------------------------------------------------------------
// 4. Production`,
    `  readonly configuration: TargetConfigurationRevision;
}

// ---------------------------------------------------------------------------
// 4. Production`],

  ['the configuration revision widens back to broad', T,
    `  readonly revision: RevisionReference<Revision>;`,
    `  readonly revision: RevisionReference;`],

  // --- composition ownership ----------------------------------------------
  ['participation regains a composition of its own', T,
    `  readonly target: EcosystemTargetReference<Target>;
  readonly configuration: TargetConfigurationRevision<Config, Revision>;
}

// ---------------------------------------------------------------------------
// 4. Production`,
    `  readonly target: EcosystemTargetReference<Target>;
  readonly configuration: TargetConfigurationRevision<Config, Revision>;
  readonly composition: TargetCompositionReference;
}

// ---------------------------------------------------------------------------
// 4. Production`],

  ['the direct arm regains a composition of its own', T,
    `  'direct-composition': Record<never, never>;
}>;

/**
 * The relation between one exact core artifact`,
    `  'direct-composition': { readonly composition: TargetCompositionReference };
}>;

/**
 * The relation between one exact core artifact`],

  ['the direct arm acquires an ecosystem target', T,
    `  'direct-composition': Record<never, never>;
}>;

/**
 * The relation between one exact core artifact`,
    `  'direct-composition': { readonly target: EcosystemTargetReference<Target> };
}>;

/**
 * The relation between one exact core artifact`],

  ['the outcome composition widens', T,
    `  composed: {
    readonly composition: TargetCompositionReference<Composition>;`,
    `  composed: {
    readonly composition: TargetCompositionReference;`],

  // --- the umbrella grows luggage -----------------------------------------
  ...LUGGAGE.map(([what, line]) => [`the umbrella grows ${what}`, T,
    `  readonly target: EcosystemTargetReference<Target>;
  readonly configuration: TargetConfigurationRevision<Config, Revision>;
}

// ---------------------------------------------------------------------------
// 4. Production`,
    `  readonly target: EcosystemTargetReference<Target>;
${line}
  readonly configuration: TargetConfigurationRevision<Config, Revision>;
}

// ---------------------------------------------------------------------------
// 4. Production`]),

  // --- second artifact vocabulary ------------------------------------------
  ...RESTATED.map(([what, key]) => [`the production relation restates ${what}`, T,
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

  ['the artifact slot widens', T,
    `  readonly slot: ArtifactSlotReference<Slot>;`,
    `  readonly slot: ArtifactSlotReference;`],

  ['target production stops reusing exact participation', T,
    `  'ecosystem-target': {
    readonly participation: TargetParticipation<Target, Config, Revision>;
  };`,
    `  'ecosystem-target': {
    readonly participation: TargetParticipation;
  };`],

  // --- altitude ------------------------------------------------------------
  ['a refusal regains a selected composition', T,
    `  refused: {
    readonly attempt: TargetAttemptReference<Attempt>;
    readonly rejection: TargetRejection;
  };`,
    `  refused: {
    readonly attempt: TargetAttemptReference<Attempt>;
    readonly composition: TargetCompositionReference<Composition>;
    readonly rejection: TargetRejection;
  };`],

  ['a refusal is identified by the composition it never became', T,
    `  refused: {
    readonly attempt: TargetAttemptReference<Attempt>;
    readonly rejection: TargetRejection;
  };`,
    `  refused: {
    readonly composition: TargetCompositionReference<Composition>;
    readonly rejection: TargetRejection;
  };`],

  ['slot claimants revert to post-selection producers', T,
    `    readonly claimants: NonEmptyTuple<SlotClaim>;`,
    `    readonly claimants: NonEmptyTuple<ArtifactProducer>;`],

  ['failure narrows to a bare target reference', T,
    `export interface TargetFailure<Participant extends TargetParticipation = TargetParticipation> {
  readonly participation: Participant;`,
    `export interface TargetFailure<Participant extends TargetParticipation = TargetParticipation> {
  readonly participation: EcosystemTargetReference;`],

  ['failure regains its duplicate composition', T,
    `export interface TargetFailure<Participant extends TargetParticipation = TargetParticipation> {
  readonly participation: Participant;`,
    `export interface TargetFailure<Participant extends TargetParticipation = TargetParticipation> {
  readonly participation: Participant;
  readonly composition: TargetCompositionReference;`],

  ['a refused outcome carries production', T,
    `  refused: {
    readonly attempt: TargetAttemptReference<Attempt>;
    readonly rejection: TargetRejection;
  };`,
    `  refused: {
    readonly attempt: TargetAttemptReference<Attempt>;
    readonly rejection: TargetRejection;
    readonly produced: readonly ProducedArtifact[];
  };`],

  ['a failed outcome reports a preselection rejection', T,
    `  failed: {
    readonly composition: TargetCompositionReference<Composition>;
    readonly failure: TargetFailure;
  };`,
    `  failed: {
    readonly composition: TargetCompositionReference<Composition>;
    readonly rejection: TargetRejection;
    readonly failure: TargetFailure;
  };`],

  ['a composed outcome admits no participants', T,
    `    readonly participants: NonEmptyTuple<TargetParticipation>;`,
    `    readonly participants: readonly TargetParticipation[];`],

  // --- exactness promises that were previously undefended -----------------
  ['the attempt reference alias stops reading its parameter', T,
    `export type TargetAttemptReference<Id extends TargetAttemptId = TargetAttemptId> = Reference<
  'target-attempt',
  Id
>;`,
    `export type TargetAttemptReference<Id extends TargetAttemptId = TargetAttemptId> = Reference<
  'target-attempt',
  TargetAttemptId
>;`],

  ['the refused attempt widens on the public path', T,
    `    readonly attempt: TargetAttemptReference<Attempt>;`,
    `    readonly attempt: TargetAttemptReference;`],

  ['the slot reference alias stops reading its parameter', T,
    `export type ArtifactSlotReference<Id extends ArtifactSlotId = ArtifactSlotId> = Reference<
  'artifact-slot',
  Id
>;`,
    `export type ArtifactSlotReference<Id extends ArtifactSlotId = ArtifactSlotId> = Reference<
  'artifact-slot',
  ArtifactSlotId
>;`],

  ['an ecosystem claim broadens its participation', T,
    `  'ecosystem-target-claim': { readonly participation: TargetParticipation<Target, Config, Revision> };`,
    `  'ecosystem-target-claim': { readonly participation: TargetParticipation };`],

  // --- reachability --------------------------------------------------------
  ['the surface stops reaching the attempt', T,
    `  readonly attempt: TargetAttemptReference;
  readonly slot: ArtifactSlotReference;`,
    `  readonly slot: ArtifactSlotReference;`],

  ['the surface stops reaching the slot claim', T,
    `  readonly claim: SlotClaim;
`,
    ``],
];

process.exit(runBank('targets-umbrella', M).clean ? 0 : 1);
