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
  Algebra,
  Brand,
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

