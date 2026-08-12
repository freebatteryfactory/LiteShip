/**
 * Shared target vocabulary.
 *
 * A target attaches already-defined LiteShip meaning and already-defined host
 * capability to an external ecosystem's configuration, build, render,
 * development, and deployment surfaces. Core answers what a program means.
 * Hosts answer how unresolved physical behaviour exists. Targets answer how an
 * ecosystem installs, registers, transforms, emits, or deploys those.
 *
 * This umbrella owns only meaning that is genuinely shared across targets *and*
 * has no home upstream. Artifact identity, content address, digest, ancestry
 * grammar, and the source relation already exist in `00_core`; restating any of
 * them here would give the architecture two artifact realities that agree by
 * coincidence. What is missing upstream, and therefore owned here, is the
 * relation: which ecosystem target produced an artifact, under which
 * configuration revision, inside which composition.
 *
 * Target children do not import one another. Astro genuinely uses Vite and
 * genuinely deploys through Cloudflare, so the exclusion is not the host
 * argument about disjoint realms -- targets coexist in one process happily.
 * It is that ecosystem usage and distribution dependency are not semantic
 * authority. A child names what it needs in upstream vocabulary and exposes
 * what it offers independently; a later composition point binds them.
 */

import type {
  Address,
  Algebra,
  Assert,
  Brand,
  CaseOf,
  Equal,
  NonEmptyTuple,
  Reference,
} from '../types.js';
import type { Diagnostic } from '../00_core/00_error/types.js';
import type { RevisionId, RevisionReference } from '../00_core/02_identity/types.js';
import type {
  Artifact,
  ArtifactId,
  ArtifactReference,
  ProjectionTargetId,
} from '../00_core/14_compiler/types.js';

// ---------------------------------------------------------------------------
// 1. Identity
// ---------------------------------------------------------------------------

/**
 * Persistent identity of one ecosystem integration: Astro, Vite, Cloudflare,
 * Remotion, or a later addition.
 *
 * Named `EcosystemTarget` rather than `Target` because `00_core/14_compiler`
 * already owns `ProjectionTargetId`, where a target is a compiler projection --
 * a backend and location. Two unrelated meanings one tier apart under one word
 * is how someone eventually binds them together.
 */
export type EcosystemTargetId<Name extends string = string> = Brand<Name, 'liteship.ecosystem-target-id'>;

/** Reference to one ecosystem integration. */
export type EcosystemTargetReference<Id extends EcosystemTargetId = EcosystemTargetId> = Reference<
  'ecosystem-target',
  Id
>;

/**
 * Persistent identity of one target configuration.
 *
 * The umbrella owns the identity and its relation to a revision. The payload,
 * its decoder, and its admission belong to the child whose ecosystem defines
 * them -- a shared configuration shape would be the universal costume under a
 * quieter name.
 */
export type TargetConfigurationId<Name extends string = string> = Brand<
  Name,
  'liteship.target-configuration-id'
>;

/** Reference to one target configuration. */
export type TargetConfigurationReference<Id extends TargetConfigurationId = TargetConfigurationId> =
  Reference<'target-configuration', Id>;

/** Persistent identity of one selected combination of participating targets. */
export type TargetCompositionId<Name extends string = string> = Brand<Name, 'liteship.target-composition-id'>;

/** Reference to one target composition. */
export type TargetCompositionReference<Id extends TargetCompositionId = TargetCompositionId> = Reference<
  'target-composition',
  Id
>;

/**
 * Identity of one artifact slot a composition requires something to fill.
 *
 * A slot is what makes alternative producers expressible. Cloudflare requires a
 * deployable application; whether Astro or a plain edge composition fills that
 * slot is a selection, not a different architecture.
 */
export type ArtifactSlotId<Name extends string = string> = Brand<Name, 'liteship.artifact-slot-id'>;

/** Reference to one required artifact slot. */
export type ArtifactSlotReference<Id extends ArtifactSlotId = ArtifactSlotId> = Reference<
  'artifact-slot',
  Id
>;

// ---------------------------------------------------------------------------
// 2. Configuration revision
// ---------------------------------------------------------------------------

/**
 * One target configuration at one exact revision.
 *
 * Configuration changes are why a build that succeeded yesterday emits
 * something different today. An artifact that cannot name the configuration
 * revision that produced it cannot explain that difference.
 */
export interface TargetConfigurationRevision<
  Id extends TargetConfigurationId = TargetConfigurationId,
  Revision extends RevisionId = RevisionId,
> {
  readonly configuration: TargetConfigurationReference<Id>;
  readonly revision: RevisionReference<Revision>;
}

// ---------------------------------------------------------------------------
// 3. Participation
// ---------------------------------------------------------------------------

/**
 * One ecosystem target participating in one composition under one exact
 * configuration revision.
 *
 * Carries references and relations only. It deliberately has no member into
 * which a child's private vocabulary could be poured -- no payload, no context,
 * no hook table. The umbrella may name the participants; it does not carry
 * their luggage.
 */
export interface TargetParticipation<
  Target extends EcosystemTargetId = EcosystemTargetId,
  Config extends TargetConfigurationId = TargetConfigurationId,
  Composition extends TargetCompositionId = TargetCompositionId,
  Revision extends RevisionId = RevisionId,
> {
  readonly target: EcosystemTargetReference<Target>;
  readonly configuration: TargetConfigurationRevision<Config, Revision>;
  readonly composition: TargetCompositionReference<Composition>;
}

// ---------------------------------------------------------------------------
// 4. Production
// ---------------------------------------------------------------------------

/**
 * Who authoritatively produced one artifact instance.
 *
 * Not every producer is an ecosystem target. A plain edge or server composition
 * may lawfully produce the same deployable output with no application framework
 * involved, and the whole direct-mode requirement depends on that staying
 * expressible.
 *
 * The target arm carries a whole `TargetParticipation` rather than a bare target
 * reference. Participation already owns the target, its exact configuration
 * revision, and the composition; restating any of those beside it would create
 * a second copy of a fact that has an owner. The direct arm carries neither a
 * target nor a target configuration, because a production with no ecosystem
 * target has no ecosystem configuration to have been produced under. Requiring
 * one would remove the framework from the room and leave its clipboard on the
 * chair.
 */
export type ArtifactProducer<
  Target extends EcosystemTargetId = EcosystemTargetId,
  Config extends TargetConfigurationId = TargetConfigurationId,
  Composition extends TargetCompositionId = TargetCompositionId,
  Revision extends RevisionId = RevisionId,
> = Algebra<{
  /** An ecosystem target produced it, under one exact configuration revision. */
  'ecosystem-target': {
    readonly participation: TargetParticipation<Target, Config, Composition, Revision>;
  };
  /**
   * A composition of upstream hosts produced it with no ecosystem target
   * involved. This arm is what makes direct mode fall out of the contract
   * instead of needing a branch in every consumer.
   */
  'direct-composition': {
    readonly composition: TargetCompositionReference<Composition>;
  };
}>;

/**
 * The relation between one exact core artifact and the production that caused
 * it.
 *
 * It binds; it does not restate. Address, digest, media type, source revision,
 * and the source relation live on the artifact. Configuration and composition
 * live on the producer. Nothing here is a second copy of a fact that already has
 * an owner, so there is no parity law to write and nothing to drift.
 */
export interface ProducedArtifact<
  Id extends ArtifactId = ArtifactId,
  Target extends ProjectionTargetId = ProjectionTargetId,
  Revision extends RevisionId = RevisionId,
  Producer extends ArtifactProducer = ArtifactProducer,
  Slot extends ArtifactSlotId = ArtifactSlotId,
> {
  readonly artifact: Artifact<Id, Target, Revision>;
  readonly producer: Producer;
  readonly slot: ArtifactSlotReference<Slot>;
  /** Artifacts this one was derived from. Empty means it is a genesis artifact. */
  readonly predecessors: readonly ArtifactReference[];
}

// ---------------------------------------------------------------------------
// 5. Refusal and failure
// ---------------------------------------------------------------------------

/**
 * Why no lawful target or composition was selected.
 *
 * Rejection happens before anything was chosen. Keeping it distinct from
 * failure is the whole altitude distinction: a deployment that failed did not
 * fail to be selected, and reporting it as a rejection rewrites history about
 * why the target was chosen.
 */
export type TargetRejection = Algebra<{
  /** The configuration never decoded into something admissible. */
  'malformed-configuration': { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  /** The ecosystem cannot support what was asked, on evidence. */
  incompatible: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  /** No participant offered what a required slot needs. */
  'unfilled-slot': { readonly slot: ArtifactSlotReference; readonly diagnostics: NonEmptyTuple<Diagnostic> };
  /**
   * More than one producer claimed the same required slot.
   *
   * Claimants are producers, not ecosystem targets. A direct composition is a
   * lawful producer, so a rejection that could only name framework targets
   * would be unable to describe the ambiguity it was reporting.
   */
  'ambiguous-slot': {
    readonly slot: ArtifactSlotReference;
    readonly claimants: NonEmptyTuple<ArtifactProducer>;
  };
}>;

/**
 * How a lawfully selected target stopped.
 *
 * Deliberately not a lifecycle enum. The umbrella states only that something
 * selected then failed and names the participant; which ecosystem phase it was
 * belongs to the child that has phases. A shared list of configuration,
 * discovery, transform, render, deploy would force Remotion to locate itself
 * inside vocabulary invented for Vite.
 *
 * It names the participant and stops. The composition belongs to the outcome
 * that carries this failure, and a copy here would be a second fact to keep in
 * agreement.
 */
export interface TargetFailure<Target extends EcosystemTargetId = EcosystemTargetId> {
  readonly target: EcosystemTargetReference<Target>;
  readonly diagnostics: NonEmptyTuple<Diagnostic>;
}

/**
 * Outcome of composing one target stack.
 *
 * Refused and failed are separate arms, and a composed result carries its
 * participants and produced artifacts. Nothing here can represent "it worked,
 * sort of" -- an outcome that could be simultaneously successful and empty is
 * the silent-degradation shape this layer exists to refuse.
 */
export type TargetCompositionOutcome<Composition extends TargetCompositionId = TargetCompositionId> =
  Algebra<{
    composed: {
      readonly composition: TargetCompositionReference<Composition>;
      readonly participants: NonEmptyTuple<TargetParticipation>;
      readonly produced: readonly ProducedArtifact[];
    };
    refused: {
      readonly composition: TargetCompositionReference<Composition>;
      readonly rejection: TargetRejection;
    };
    failed: {
      readonly composition: TargetCompositionReference<Composition>;
      readonly failure: TargetFailure;
    };
  }>;

// ---------------------------------------------------------------------------
// 6. Explanation input
// ---------------------------------------------------------------------------
//
// There is no `TargetFacts` product and no `TargetExplanation`.
//
// `TargetCompositionOutcome` is what projects into core's existing
// `Explanation`, which already owns subject, facts, settlement, artifacts,
// diagnostics, and next actions. A consumer should inherit one explanation
// system rather than a fresh dialect from every layer of the waterfall.
//
// An earlier draft wrapped the outcome in a facts product carrying its own
// composition, participants, and produced artifacts. That let a refused outcome
// sit beside a non-empty production array: the law forbidding refusal to carry
// production held, and the wrapper laundered it one object outward. A wrapper
// that restates what it wraps is not an abstraction, and there is no additional
// fact yet that would justify inventing the noun again.

// ---------------------------------------------------------------------------
// 7. Laws
// ---------------------------------------------------------------------------

type TargetLawAstro = EcosystemTargetId<'law.target.astro'>;
type TargetLawVite = EcosystemTargetId<'law.target.vite'>;
type ConfigLawA = TargetConfigurationId<'law.config.a'>;
type ConfigLawB = TargetConfigurationId<'law.config.b'>;
type CompositionLawA = TargetCompositionId<'law.composition.a'>;
type CompositionLawB = TargetCompositionId<'law.composition.b'>;
type SlotLawA = ArtifactSlotId<'law.slot.a'>;
type RevisionLawA = Address<
  'liteship.content:application/vnd.liteship.revision+cbor',
  'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
>;
type LawParticipation = TargetParticipation<TargetLawAstro, ConfigLawA, CompositionLawA, RevisionLawA>;
type LawTargetProducer = ArtifactProducer<TargetLawAstro, ConfigLawA, CompositionLawA, RevisionLawA>;

/** Compile-time law: an ecosystem target reference is exact over the target it names. */
export type AnEcosystemTargetReferenceIsExact = Assert<
  Equal<
    [
      EcosystemTargetReference<TargetLawAstro> extends EcosystemTargetReference<TargetLawVite> ? true : false,
      EcosystemTargetReference<TargetLawAstro> extends EcosystemTargetReference<TargetLawAstro> ? true : false,
    ],
    [false, true]
  >
>;

/**
 * Compile-time law: an ecosystem target is not a compiler projection target.
 *
 * The two meanings sit one tier apart under one English word. This law is the
 * reason the longer name was worth its extra syllables.
 */
export type AnEcosystemTargetIsNotAProjectionTarget = Assert<
  Equal<EcosystemTargetId<'x'> extends ProjectionTargetId<'x'> ? true : false, false>
>;

/**
 * Compile-time law: participation binds an exact target, configuration
 * identity, configuration revision, and composition.
 *
 * The revision is checked, not merely parameterised. A generic that no law
 * reads is a generic that can be deleted without anything turning red.
 */
export type ParticipationBindsItsExactRelations = Assert<
  Equal<
    [
      LawParticipation['target'],
      LawParticipation['configuration']['configuration'],
      LawParticipation['configuration']['revision'],
      LawParticipation['composition'],
    ],
    [
      EcosystemTargetReference<TargetLawAstro>,
      TargetConfigurationReference<ConfigLawA>,
      RevisionReference<RevisionLawA>,
      TargetCompositionReference<CompositionLawA>,
    ]
  >
>;

/** Compile-time law: differing on any axis produces a participation that cannot substitute. */
export type ParticipationsAreNotInterchangeable = Assert<
  Equal<
    [
      TargetParticipation<TargetLawAstro, ConfigLawA, CompositionLawA> extends TargetParticipation<
        TargetLawVite,
        ConfigLawA,
        CompositionLawA
      >
        ? true
        : false,
      TargetParticipation<TargetLawAstro, ConfigLawA, CompositionLawA> extends TargetParticipation<
        TargetLawAstro,
        ConfigLawB,
        CompositionLawA
      >
        ? true
        : false,
      TargetParticipation<TargetLawAstro, ConfigLawA, CompositionLawA> extends TargetParticipation<
        TargetLawAstro,
        ConfigLawA,
        CompositionLawB
      >
        ? true
        : false,
    ],
    [false, false, false]
  >
>;

/**
 * Compile-time law: a produced artifact binds the core artifact rather than
 * restating it.
 *
 * The absences are the law. If any of these keys appears here, the architecture
 * has acquired a second artifact vocabulary, and the two will agree only for as
 * long as someone keeps checking.
 */
export type AProducedArtifactRestatesNothing = Assert<
  Equal<
    [
      ProducedArtifact['artifact'] extends Artifact ? true : false,
      'address' extends keyof ProducedArtifact ? true : false,
      'digest' extends keyof ProducedArtifact ? true : false,
      'mediaType' extends keyof ProducedArtifact ? true : false,
      'source' extends keyof ProducedArtifact ? true : false,
      'relation' extends keyof ProducedArtifact ? true : false,
      'sourceMap' extends keyof ProducedArtifact ? true : false,
      // configuration and composition belong to the producer
      'configuration' extends keyof ProducedArtifact ? true : false,
      'composition' extends keyof ProducedArtifact ? true : false,
    ],
    [true, false, false, false, false, false, false, false, false]
  >
>;

/** Compile-time law: a produced artifact pins the exact slot it fills. */
export type AProducedArtifactPinsItsExactSlot = Assert<
  Equal<
    ProducedArtifact<ArtifactId, ProjectionTargetId, RevisionId, ArtifactProducer, SlotLawA>['slot'],
    ArtifactSlotReference<SlotLawA>
  >
>;

/**
 * Compile-time law: target production reuses participation rather than
 * restating its parts.
 */
export type EcosystemProductionReusesExactParticipation = Assert<
  Equal<CaseOf<LawTargetProducer, 'ecosystem-target'>['participation'], LawParticipation>
>;

/**
 * Compile-time law: production is expressible with no ecosystem target and no
 * target configuration.
 *
 * This is the direct-mode acceptance test as a type. A composition of hosts
 * alone can produce an artifact, so a consumer never needs to ask which
 * framework was involved, and no consumer needs a "without Astro" branch. The
 * configuration absence matters as much as the target absence: a direct
 * production required to name an ecosystem configuration is still an
 * ecosystem-shaped path wearing a different label.
 */
export type DirectProductionNeedsNoTargetContext = Assert<
  Equal<
    [
      'target' extends keyof CaseOf<ArtifactProducer, 'direct-composition'> ? true : false,
      'participation' extends keyof CaseOf<ArtifactProducer, 'direct-composition'> ? true : false,
      'configuration' extends keyof CaseOf<ArtifactProducer, 'direct-composition'> ? true : false,
    ],
    [false, false, false]
  >
>;

/** Compile-time law: an ambiguous slot can name every lawful producer kind. */
export type AnAmbiguousSlotNamesEveryProducerKind = Assert<
  Equal<CaseOf<TargetRejection, 'ambiguous-slot'>['claimants'], NonEmptyTuple<ArtifactProducer>>
>;

/**
 * Compile-time law: failure names the participant and stops.
 *
 * The composition belongs to the outcome carrying the failure. A copy here
 * would be a second fact requiring a parity law nobody would remember to write.
 */
export type FailureDoesNotDuplicateComposition = Assert<
  Equal<'composition' extends keyof TargetFailure ? true : false, false>
>;

/**
 * Compile-time law: the umbrella carries no per-target luggage and no universal
 * lifecycle.
 *
 * Named members are checked because a junk drawer does not become
 * constitutional by dropping the word Astro from its label -- `payload`,
 * `context`, and `hooks` are the same costume with the tag cut out.
 */
export type TheUmbrellaCarriesNoTargetLuggage = Assert<
  Equal<
    [
      'astro' extends keyof TargetParticipation ? true : false,
      'vite' extends keyof TargetParticipation ? true : false,
      'cloudflare' extends keyof TargetParticipation ? true : false,
      'remotion' extends keyof TargetParticipation ? true : false,
      'payload' extends keyof TargetParticipation ? true : false,
      'context' extends keyof TargetParticipation ? true : false,
      'hooks' extends keyof TargetParticipation ? true : false,
      'phase' extends keyof TargetParticipation ? true : false,
      'lifecycle' extends keyof TargetParticipation ? true : false,
    ],
    [false, false, false, false, false, false, false, false, false]
  >
>;

/**
 * Compile-time law: refusal and failure stay distinct, and neither carries
 * production.
 *
 * A refused composition holding artifacts would let a caller keep shipping past
 * a refusal because the payload looked survivable.
 */
export type RefusalAndFailureCarryNoProduction = Assert<
  Equal<
    [
      'produced' extends keyof CaseOf<TargetCompositionOutcome, 'refused'> ? true : false,
      'produced' extends keyof CaseOf<TargetCompositionOutcome, 'failed'> ? true : false,
      'rejection' extends keyof CaseOf<TargetCompositionOutcome, 'failed'> ? true : false,
      'failure' extends keyof CaseOf<TargetCompositionOutcome, 'refused'> ? true : false,
    ],
    [false, false, false, false]
  >
>;

/** Compile-time law: a composed outcome has at least one participant. */
export type AComposedOutcomeHasParticipants = Assert<
  Equal<CaseOf<TargetCompositionOutcome, 'composed'>['participants'], NonEmptyTuple<TargetParticipation>>
>;

/** Type summary consumed by the root topology. */
export interface TargetTypeSurface {
  readonly target: EcosystemTargetReference;
  readonly configuration: TargetConfigurationRevision;
  readonly composition: TargetCompositionReference;
  readonly slot: ArtifactSlotReference;
  readonly participation: TargetParticipation;
  readonly produced: ProducedArtifact;
  readonly producer: ArtifactProducer;
  readonly rejection: TargetRejection;
  readonly failure: TargetFailure;
  readonly outcome: TargetCompositionOutcome;
}
