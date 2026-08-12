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
 * relation: which ecosystem target produced an artifact, and under which
 * configuration revision. The composition it happened inside is owned by the
 * outcome that reports it, once, and by nothing else.
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

/**
 * Persistent identity of one *selected* target-layer composition.
 *
 * Selected is the whole meaning. A composition exists once producers have been
 * chosen and the stack is lawful; it is not the roster of targets someone
 * considered. Anything that never reached selection must not carry this
 * identity, or a rejected attempt ends up holding the identity of a composition
 * it never became.
 */
export type TargetCompositionId<Name extends string = string> = Brand<Name, 'liteship.target-composition-id'>;

/** Reference to one selected target composition. */
export type TargetCompositionReference<Id extends TargetCompositionId = TargetCompositionId> = Reference<
  'target-composition',
  Id
>;

/**
 * Persistent identity of one attempt to compose a target stack.
 *
 * An attempt is the pre-selection coordinate. It exists as soon as something is
 * evaluated and survives whether or not a composition is ever selected, which
 * is what lets a refusal be identified without borrowing the identity of the
 * composition it failed to become.
 */
export type TargetAttemptId<Name extends string = string> = Brand<Name, 'liteship.target-attempt-id'>;

/** Reference to one composition attempt. */
export type TargetAttemptReference<Id extends TargetAttemptId = TargetAttemptId> = Reference<
  'target-attempt',
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
 * One ecosystem target participating under one exact configuration revision.
 *
 * It does not name the composition it participates in. The outcome owns that
 * identity, and a participation only ever appears inside one. Carrying a copy
 * would let an outcome for composition A hold participants stamped with
 * composition B -- an exact local generic beside a broad public carrier, which
 * is the failure this project has now paid for twice.
 *
 * Carries references and relations only. It deliberately has no member into
 * which a child's private vocabulary could be poured -- no payload, no context,
 * no hook table. The umbrella may name the participants; it does not carry
 * their luggage.
 */
export interface TargetParticipation<
  Target extends EcosystemTargetId = EcosystemTargetId,
  Config extends TargetConfigurationId = TargetConfigurationId,
  Revision extends RevisionId = RevisionId,
> {
  readonly target: EcosystemTargetReference<Target>;
  readonly configuration: TargetConfigurationRevision<Config, Revision>;
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
 * reference. Participation already owns the target and its exact configuration
 * revision; restating either beside it would create a second copy of a fact
 * that has an owner. Neither arm names a composition -- the outcome owns that. The direct arm carries neither a
 * target nor a target configuration, because a production with no ecosystem
 * target has no ecosystem configuration to have been produced under. Requiring
 * one would remove the framework from the room and leave its clipboard on the
 * chair.
 */
export type ArtifactProducer<
  Target extends EcosystemTargetId = EcosystemTargetId,
  Config extends TargetConfigurationId = TargetConfigurationId,
  Revision extends RevisionId = RevisionId,
> = Algebra<{
  /** An ecosystem target produced it, under one exact configuration revision. */
  'ecosystem-target': {
    readonly participation: TargetParticipation<Target, Config, Revision>;
  };
  /**
   * A composition of upstream hosts produced it with no ecosystem target
   * involved. This arm is what makes direct mode fall out of the contract
   * instead of needing a branch in every consumer.
   *
   * It is empty, and that is the point. Direct production has no ecosystem
   * target, no target configuration, and no composition of its own -- the
   * composition it happened inside is owned by the outcome that reports it.
   * Every member this arm could grow is a member a consumer would eventually
   * branch on.
   */
  'direct-composition': Record<never, never>;
}>;

/**
 * The relation between one exact core artifact and the production that caused
 * it.
 *
 * It binds; it does not restate. Address, digest, media type, source revision,
 * and the source relation live on the artifact. Configuration lives on the
 * producer, and composition on the outcome. Nothing here is a second copy of a fact that already has
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
/**
 * A pre-selection offer to fill one required slot.
 *
 * The mirror of `ArtifactProducer` at the altitude below it. A claim says what
 * offered; a producer says what produced. Keeping the two apart is what stops a
 * refusal from being reported in the vocabulary of a success.
 */
export type SlotClaim<
  Target extends EcosystemTargetId = EcosystemTargetId,
  Config extends TargetConfigurationId = TargetConfigurationId,
  Revision extends RevisionId = RevisionId,
> = Algebra<{
  // The tags say `claim`. Without that the arms would be structurally identical
  // to `ArtifactProducer`, and two types with different meanings and one shape
  // are interchangeable to the compiler no matter what the comments say -- the
  // same defect as one brand in two homes, one altitude up.
  'ecosystem-target-claim': { readonly participation: TargetParticipation<Target, Config, Revision> };
  'direct-composition-claim': Record<never, never>;
}>;

export type TargetRejection = Algebra<{
  /** The configuration never decoded into something admissible. */
  'malformed-configuration': { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  /** The ecosystem cannot support what was asked, on evidence. */
  incompatible: { readonly diagnostics: NonEmptyTuple<Diagnostic> };
  /** No participant offered what a required slot needs. */
  'unfilled-slot': { readonly slot: ArtifactSlotReference; readonly diagnostics: NonEmptyTuple<Diagnostic> };
  /**
   * More than one candidate claimed the same required slot.
   *
   * Claimants are claims, not producers. `ArtifactProducer` names who
   * authoritatively produced an artifact instance, which is post-selection
   * vocabulary; nothing has been selected at the point this rejection is
   * raised, and using production vocabulary here would let a rejected
   * candidate wear the coordinate of a producer that never produced anything.
   */
  'ambiguous-slot': {
    readonly slot: ArtifactSlotReference;
    readonly claimants: NonEmptyTuple<SlotClaim>;
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
 * It carries the exact participation that failed, not merely its target. A
 * failure that named only the target would lose the configuration revision on
 * precisely the path where someone needs to know which configuration was in
 * effect when it broke. The composition belongs to the outcome carrying this
 * failure, and a copy here would be a second fact to keep in agreement.
 */
export interface TargetFailure<Participant extends TargetParticipation = TargetParticipation> {
  readonly participation: Participant;
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
export type TargetCompositionOutcome<
  Composition extends TargetCompositionId = TargetCompositionId,
  Attempt extends TargetAttemptId = TargetAttemptId,
> = Algebra<{
  composed: {
    readonly composition: TargetCompositionReference<Composition>;
    readonly participants: NonEmptyTuple<TargetParticipation>;
    readonly produced: readonly ProducedArtifact[];
  };
  /**
   * Nothing was selected, so there is no composition to name. It carries the
   * attempt instead. Handing a refusal a selected-composition reference would
   * give it the identity of something it never became.
   */
  refused: {
    readonly attempt: TargetAttemptReference<Attempt>;
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
type SlotLawB = ArtifactSlotId<'law.slot.b'>;
type AttemptLawA = TargetAttemptId<'law.attempt.a'>;
type AttemptLawB = TargetAttemptId<'law.attempt.b'>;
type RevisionLawA = Address<
  'liteship.content:application/vnd.liteship.revision+cbor',
  'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
>;
type RevisionLawB = Address<
  'liteship.content:application/vnd.liteship.revision+cbor',
  'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd'
>;
type LawParticipation = TargetParticipation<TargetLawAstro, ConfigLawA, RevisionLawA>;
type LawTargetProducer = ArtifactProducer<TargetLawAstro, ConfigLawA, RevisionLawA>;

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
 * identity, and configuration revision.
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
    ],
    [
      EcosystemTargetReference<TargetLawAstro>,
      TargetConfigurationReference<ConfigLawA>,
      RevisionReference<RevisionLawA>,
    ]
  >
>;

/**
 * Compile-time law: the outcome is the sole owner of composition identity.
 *
 * Neither a participation nor a producer names a composition. This is what
 * makes the mismatch unrepresentable rather than merely forbidden: an outcome
 * for composition A cannot hold participants stamped with composition B,
 * because participants carry no such stamp. The alternative -- threading the
 * composition generic through both populations -- would correlate two copies of
 * a fact instead of leaving it with one owner.
 */
export type CompositionIsOwnedByTheOutcomeAlone = Assert<
  Equal<
    [
      'composition' extends keyof TargetParticipation ? true : false,
      'composition' extends keyof CaseOf<ArtifactProducer, 'direct-composition'> ? true : false,
      'composition' extends keyof CaseOf<ArtifactProducer, 'ecosystem-target'> ? true : false,
      'composition' extends keyof ProducedArtifact ? true : false,
      'composition' extends keyof TargetFailure ? true : false,
    ],
    [false, false, false, false, false]
  >
>;

/**
 * Compile-time law: attempt and composition are distinct reference kinds.
 *
 * Compared against the literal kind strings rather than against the aliases.
 * Comparing an alias to itself passes when the alias is edited, which is
 * precisely how an attempt reference could quietly start naming the selected
 * composition kind and take the rejection altitude down with it.
 */
export type AttemptAndCompositionAreDistinctKinds = Assert<
  Equal<
    [TargetAttemptReference<TargetAttemptId>, TargetCompositionReference<TargetCompositionId>],
    [Reference<'target-attempt', TargetAttemptId>, Reference<'target-composition', TargetCompositionId>]
  >
>;

/**
 * Compile-time law: a claim is not a producer.
 *
 * Structural equality is the whole point. The two carry the same payload, so
 * only their tags keep them apart, and a law that merely named `SlotClaim`
 * would pass while claimants silently became post-selection producers.
 */
export type AClaimIsNotAProducer = Assert<
  Equal<
    [SlotClaim extends ArtifactProducer ? true : false, ArtifactProducer extends SlotClaim ? true : false],
    [false, false]
  >
>;

/**
 * Compile-time law: an attempt reference is exact over the attempt it names.
 *
 * Compared against the literal reference form. Comparing the alias to itself
 * passes when the alias stops reading its parameter, which is exactly how two
 * distinct attempts become one.
 */
export type AnAttemptReferenceIsExactOverItsAttempt = Assert<
  Equal<
    [
      TargetAttemptReference<AttemptLawA>,
      TargetAttemptReference<AttemptLawA> extends TargetAttemptReference<AttemptLawB> ? true : false,
    ],
    [Reference<'target-attempt', AttemptLawA>, false]
  >
>;

/** Compile-time law: the exact attempt survives the public refused path. */
export type ARefusedOutcomePinsItsExactAttempt = Assert<
  Equal<
    CaseOf<TargetCompositionOutcome<TargetCompositionId, AttemptLawA>, 'refused'>['attempt'],
    TargetAttemptReference<AttemptLawA>
  >
>;

/**
 * Compile-time law: a slot reference is exact over the slot it names.
 *
 * Also compared against the literal form. The production law reads the alias on
 * both sides, so if the alias began ignoring its parameter both sides would
 * broaden together and stay green while slot A became slot B.
 */
export type AnArtifactSlotReferenceIsExactOverItsSlot = Assert<
  Equal<
    [
      ArtifactSlotReference<SlotLawA>,
      ArtifactSlotReference<SlotLawA> extends ArtifactSlotReference<SlotLawB> ? true : false,
    ],
    [Reference<'artifact-slot', SlotLawA>, false]
  >
>;

/**
 * Compile-time law: an ecosystem claim carries the exact participation that
 * made it, and two claims are not interchangeable.
 *
 * The pre-selection half of the proof already applied to production. Without
 * it the claim's generics are decorative and a rejection could name a
 * participation that never claimed anything.
 */
export type AnEcosystemClaimReusesExactParticipation = Assert<
  Equal<
    [
      CaseOf<SlotClaim<TargetLawAstro, ConfigLawA, RevisionLawA>, 'ecosystem-target-claim'>['participation'],
      SlotClaim<TargetLawAstro, ConfigLawA, RevisionLawA> extends SlotClaim<TargetLawVite, ConfigLawA, RevisionLawA>
        ? true
        : false,
    ],
    [LawParticipation, false]
  >
>;

/**
 * Compile-time law: an outcome pins the exact composition it reports on, and
 * two compositions are not interchangeable.
 *
 * The counterpart to the previous law. Composition has exactly one owner, and
 * this proves the owner actually holds it exactly rather than widening at the
 * boundary where a consumer receives it.
 */
export type AnOutcomePinsItsExactComposition = Assert<
  Equal<
    [
      CaseOf<TargetCompositionOutcome<CompositionLawA>, 'composed'>['composition'],
      CaseOf<TargetCompositionOutcome<CompositionLawA>, 'failed'>['composition'],
      TargetCompositionOutcome<CompositionLawA> extends TargetCompositionOutcome<CompositionLawB>
        ? true
        : false,
    ],
    [
      TargetCompositionReference<CompositionLawA>,
      TargetCompositionReference<CompositionLawA>,
      false,
    ]
  >
>;

/**
 * Compile-time law: a refusal carries an attempt, never a selected composition.
 *
 * Rejection happens before selection. A refused arm holding a
 * `TargetCompositionReference` would give a rejected attempt the identity of a
 * composition it never became -- the target-shaped version of handing a
 * rejected compiler branch a candidate reference.
 */
export type ARefusalCarriesNoSelectedComposition = Assert<
  Equal<
    [
      CaseOf<TargetCompositionOutcome, 'refused'>['attempt'],
      'composition' extends keyof CaseOf<TargetCompositionOutcome, 'refused'> ? true : false,
    ],
    [TargetAttemptReference, false]
  >
>;

/**
 * Compile-time law: failure carries the exact participation that failed.
 *
 * Naming only the target would drop the configuration revision on exactly the
 * path where someone needs to know which configuration was in effect when it
 * broke.
 */
export type FailureCarriesExactParticipation = Assert<
  Equal<TargetFailure<LawParticipation>['participation'], LawParticipation>
>;

/**
 * Compile-time law: slot claimants are claims, not producers.
 *
 * Production vocabulary at a pre-selection altitude would let a rejected
 * candidate wear the coordinate of a producer that never produced anything.
 */
export type ClaimantsAreClaimsNotProducers = Assert<
  Equal<CaseOf<TargetRejection, 'ambiguous-slot'>['claimants'], NonEmptyTuple<SlotClaim>>
>;

/** Compile-time law: differing on any axis produces a participation that cannot substitute. */
export type ParticipationsAreNotInterchangeable = Assert<
  Equal<
    [
      LawParticipation extends TargetParticipation<TargetLawVite, ConfigLawA, RevisionLawA> ? true : false,
      LawParticipation extends TargetParticipation<TargetLawAstro, ConfigLawB, RevisionLawA> ? true : false,
      LawParticipation extends TargetParticipation<TargetLawAstro, ConfigLawA, RevisionLawB> ? true : false,
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
      // configuration belongs to the producer; composition belongs to the outcome
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

// ---------------------------------------------------------------------------
// 8. The deployable application
//
// Deferred until a denominator earned its representation, which Cloudflare's
// did. Four shapes were possible and the choice was not free: one artifact, a
// non-empty set, an entry plus assets, or a manifest of references.
//
// One artifact cannot express a worker script beside the static files it
// serves. A bare non-empty set loses which member is the entry, so a consumer
// has to guess or a convention has to be invented. A manifest of references is
// a second artifact vocabulary — the exact thing this home refuses everywhere
// else. An entry plus assets is what remains, and it is what a deployment
// actually consumes.

/**
 * What a composition hands to a deployment, whoever produced it.
 *
 * The producers live on the artifacts, and `ArtifactProducer` already covers
 * both arms — so an application assembled by an ecosystem target and one
 * assembled by hosts alone are the same type, and a consumer has nothing to
 * branch on. That is the direct-mode acceptance test stated as a contract
 * rather than promised in prose.
 *
 * `assets` may be empty. A worker with no static files is an ordinary
 * deployment, not a degenerate one.
 */
export interface DeployableApplication {
  readonly entry: ProducedArtifact;
  readonly assets: readonly ProducedArtifact[];
}

/**
 * Compile-time law: a deployable application is producer-agnostic.
 *
 * An application whose entry was produced by an ecosystem target and one whose
 * entry was produced by a host-only composition are the same type. If this ever
 * fails, a consumer has acquired something to branch on, and `withoutAstro`
 * becomes expressible somewhere downstream.
 */
export type ADeployableApplicationIsProducerAgnostic = Assert<
  Equal<
    [
      DeployableApplication['entry']['producer'] extends ArtifactProducer ? true : false,
      'target' extends keyof DeployableApplication ? true : false,
      'participation' extends keyof DeployableApplication ? true : false,
      'composition' extends keyof DeployableApplication ? true : false,
      'framework' extends keyof DeployableApplication ? true : false,
    ],
    [true, false, false, false, false]
  >
>;

/**
 * Compile-time law: the entry is singular and the assets are separate.
 *
 * A set with no distinguished entry forces a consumer to guess which member to
 * run. A bare tuple of artifacts would be exactly that set.
 */
export type ADeployableApplicationHasOneEntry = Assert<
  Equal<
    [
      Equal<DeployableApplication['entry'], ProducedArtifact>,
      Equal<DeployableApplication['assets'], readonly ProducedArtifact[]>,
      DeployableApplication extends readonly ProducedArtifact[] ? true : false,
    ],
    [true, true, false]
  >
>;

/**
 * Compile-time law: a deployable application restates no artifact facts.
 *
 * It binds produced artifacts and adds nothing. Address, digest, media type,
 * and slot all live where they already lived; a manifest member here would be
 * the second artifact vocabulary this home spent the whole umbrella refusing.
 */
export type ADeployableApplicationRestatesNothing = Assert<
  Equal<
    [
      'address' extends keyof DeployableApplication ? true : false,
      'digest' extends keyof DeployableApplication ? true : false,
      'manifest' extends keyof DeployableApplication ? true : false,
      'slot' extends keyof DeployableApplication ? true : false,
    ],
    [false, false, false, false]
  >
>;

/**
 * Compile-time law (T15): the outcome projects into core's explanation and
 * declares no explanation vocabulary of its own.
 *
 * This was a proof obligation stated in prose while nothing checked it. The
 * risk is not that someone writes a bad explanation — it is that a second one
 * appears, because a layer that grows a `facts` or `report` member has already
 * stopped inheriting core's envelope, and every consumer downstream then has
 * two dialects to reconcile.
 *
 * An earlier draft did exactly this: a facts product wrapping the outcome, which
 * let a refused outcome sit beside a non-empty production array while the law
 * forbidding that held one object inward. The names are checked because a
 * wrapper is one member away at all times.
 */
export type TheOutcomeProjectsIntoTheOneExplanation = Assert<
  Equal<
    [
      'explanation' extends keyof CaseOf<TargetCompositionOutcome, 'composed'> ? true : false,
      'facts' extends keyof CaseOf<TargetCompositionOutcome, 'composed'> ? true : false,
      'report' extends keyof CaseOf<TargetCompositionOutcome, 'composed'> ? true : false,
      'rendered' extends keyof CaseOf<TargetCompositionOutcome, 'composed'> ? true : false,
      // What a projection actually reads: the selected composition, its
      // participants, and what they produced. All three present, none wrapped.
      keyof CaseOf<TargetCompositionOutcome, 'composed'>,
    ],
    [
      false,
      false,
      false,
      false,
      '_tag' | 'composition' | 'participants' | 'produced',
    ]
  >
>;

/**
 * Compile-time law (T16): every product carries the identity of the phase it
 * belongs to, and the two phases cannot be swapped.
 *
 * Rejection precedes selection and is identified by an attempt; failure follows
 * selection and names the participation that failed. Phase correctness was
 * asserted in prose while the only thing enforcing it was that nobody had tried
 * the swap.
 *
 * Both directions are checked. A rejection acquiring a composition reference
 * would give a refusal the identity of something it never became; a failure
 * falling back to an attempt would lose the participant that actually failed,
 * and a post-selection failure with no participant is indistinguishable from a
 * pre-selection refusal.
 */
export type EveryProductCarriesItsPhaseIdentity = Assert<
  Equal<
    [
      // Pre-selection: the refusal carries an attempt and no composition.
      keyof CaseOf<TargetCompositionOutcome, 'refused'>,
      // Post-selection: the failure carries the selected composition and the
      // participation that failed, and never falls back to an attempt.
      keyof CaseOf<TargetCompositionOutcome, 'failed'>,
      TargetFailure['participation'] extends TargetParticipation ? true : false,
      'attempt' extends keyof TargetFailure ? true : false,
      // And the two identity kinds remain distinct populations, so no product
      // can quietly change phase by swapping which reference it holds.
      TargetAttemptReference extends TargetCompositionReference ? true : false,
      TargetCompositionReference extends TargetAttemptReference ? true : false,
    ],
    [
      '_tag' | 'attempt' | 'rejection',
      '_tag' | 'composition' | 'failure',
      true,
      false,
      false,
      false,
    ]
  >
>;

/** Type summary consumed by the root topology. */
export interface TargetTypeSurface {
  readonly deployable: DeployableApplication;
  readonly target: EcosystemTargetReference;
  readonly configuration: TargetConfigurationRevision;
  readonly composition: TargetCompositionReference;
  readonly attempt: TargetAttemptReference;
  readonly slot: ArtifactSlotReference;
  readonly claim: SlotClaim;
  readonly participation: TargetParticipation;
  readonly produced: ProducedArtifact;
  readonly producer: ArtifactProducer;
  readonly rejection: TargetRejection;
  readonly failure: TargetFailure;
  readonly outcome: TargetCompositionOutcome;
}

/**
 * Compile-time law: every family this home owns is reachable from its surface.
 *
 * A declaration the topology summary does not name is correct and unreached,
 * which the completion standard treats as incomplete. Attempt and claim were
 * both stranded this way when they were introduced.
 */
export type TheSurfaceReachesEveryOwnedFamily = Assert<
  Equal<
    [TargetTypeSurface['attempt'], TargetTypeSurface['claim']],
    [TargetAttemptReference, SlotClaim]
  >
>;
