/**
 * Evidence state, three-valued truth, authority, and inspectable propositions.
 *
 * Operational state and epistemic uncertainty are separate. Failure never
 * silently becomes unknown, false, or pending. The logical proposition algebra
 * is generic so collections, policies, and other domains reuse one Strong
 * Kleene implementation rather than inventing parallel boolean systems.
 *
 * @module
 */

import type {
  Algebra,
  Assert,
  Brand,
  CaseOf,
  Equal,
  Hole,
  NonEmptyTuple,
  Reference,
  RequirementRow,
  TagOf,
} from '../../types.js';
import type { Diagnostic } from '../00_error/types.js';
import type { CanonicalValue, ContentAddress } from '../01_encoding/types.js';
import type { SchemaId, SchemaReference } from '../03_schema/types.js';
import type { TimeCoordinate } from '../04_time/types.js';

/** Kleene three-valued truth. */
export type Truth = 'true' | 'false' | 'unknown';

/** Operational state of an evidence source. */
export type Evidence<Value, Failure = readonly Diagnostic[]> = Algebra<{
  unavailable: { readonly reason?: string };
  pending: { readonly since?: TimeCoordinate };
  ready: { readonly value: Value; readonly observedAt?: TimeCoordinate };
  failed: { readonly error: Failure; readonly observedAt?: TimeCoordinate };
}>;

export type EvidenceSourceId<Name extends string = string> = Brand<Name, 'liteship.evidence-source-id'>;
export type EvidenceReference<Id extends EvidenceSourceId = EvidenceSourceId> = Reference<'evidence-source', Id>;

export type EvidenceLifetime = 'static' | 'request' | 'session' | 'connection' | 'transaction' | 'frame' | 'sample';
export type EvidenceEvolution = 'constant' | 'monotonic' | 'retractable' | 'continuous';
export type EvidenceAuthority = 'advisory' | 'presentational' | 'authenticated' | 'authoritative';
export type EvidenceCadence = 'on-demand' | 'event' | 'frame' | 'sample' | 'poll';
export type EvidenceRealm = 'build' | 'web' | 'worker' | 'edge' | 'server';

/** Complete classification of one evidence source. */
export interface EvidenceSourceDefinition<
  Value = unknown,
  Failure = readonly Diagnostic[],
  Requirements extends RequirementRow = readonly [],
> {
  readonly id: EvidenceSourceId;
  readonly valueSchema: SchemaReference<SchemaId, Value>;
  readonly failureSchema?: SchemaReference<SchemaId, Failure>;
  readonly lifetime: EvidenceLifetime;
  readonly evolution: EvidenceEvolution;
  readonly authority: EvidenceAuthority;
  readonly cadence: EvidenceCadence;
  readonly realm: EvidenceRealm;
  readonly requirements: Requirements;
  readonly cost?: { readonly startup?: number; readonly update?: number; readonly dispose?: number };
}

/** Generic Strong Kleene proposition over a domain-specific atomic predicate. */
export type Proposition<Atom> = Algebra<{
  literal: { readonly value: Truth };
  atom: { readonly value: Atom };
  not: { readonly operand: Proposition<Atom> };
  and: { readonly operands: NonEmptyTuple<Proposition<Atom>> };
  or: { readonly operands: NonEmptyTuple<Proposition<Atom>> };
}>;

/** Evidence-specific atomic predicates. */
export type EvidencePredicate = Algebra<{
  source: { readonly source: EvidenceReference };
  equals: { readonly left: EvidenceReference; readonly right: CanonicalValue };
  compare: {
    readonly left: EvidenceReference;
    readonly operator: '<' | '<=' | '>' | '>=';
    readonly right: number;
  };
  available: { readonly source: EvidenceReference };
  failed: { readonly source: EvidenceReference };
}>;

/** Standard proposition over evidence sources. */
export type EvidenceProposition = Proposition<EvidencePredicate>;

/** One reason a decision remains unresolved. */
export type DecisionBlocker<Subject = EvidenceReference> = Algebra<{
  unavailable: { readonly subject: Subject; readonly reason?: string };
  pending: { readonly subject: Subject; readonly since?: TimeCoordinate };
  unknown: { readonly subject?: Subject; readonly reason?: string };
}>;

/** Decision retains truth, blockers, failures, and supporting subjects. */
export interface Decision<
  Subject = EvidenceReference,
  Failure = readonly Diagnostic[],
> {
  readonly truth: Truth;
  readonly blockers: readonly DecisionBlocker<Subject>[];
  readonly failures: readonly { readonly subject: Subject; readonly error: Failure }[];
  readonly supportingSubjects: readonly Subject[];
}

/** One source update suitable for semantic streams and replay. */
export interface EvidenceUpdate<Value = CanonicalValue, Failure = readonly Diagnostic[]> {
  readonly source: EvidenceReference;
  readonly evidence: Evidence<Value, Failure>;
  readonly observedAt?: TimeCoordinate;
}

/** Advanced foreign evaluator whose lost compiler privileges are explicit. */
export interface ForeignEvidenceAdapter<
  Value = unknown,
  Requirements extends RequirementRow = readonly [],
> {
  readonly id: Brand<string, 'liteship.foreign-evidence-adapter'>;
  readonly outputSchema: SchemaReference<SchemaId, Value>;
  readonly realm: Exclude<EvidenceRealm, 'build'>;
  readonly authority: EvidenceAuthority;
  readonly lifetime: EvidenceLifetime;
  readonly cadence: EvidenceCadence;
  readonly requirements: Requirements;
  readonly explanation: string;
  readonly serializable: false;
  readonly portable: false;
  readonly staticSettlement: false;
}

/** Example authority hole; availability remains Evidence inside the contract. */
export type EvidenceSourceRegistry = Hole<
  'liteship.evidence.sources',
  ReadonlyMap<EvidenceSourceId, EvidenceSourceDefinition>
>;

// ---------------------------------------------------------------------------
// Observations and cuts
// ---------------------------------------------------------------------------

export type EvidenceObservationId<Name extends string = string> = Brand<
  Name,
  'liteship.evidence-observation-id'
>;
export type EvidenceObservationReference<Id extends EvidenceObservationId = EvidenceObservationId> =
  Reference<'evidence-observation', Id>;

/**
 * One exact observation contributed to a cut.
 *
 * The contributed state is the full `Evidence` algebra rather than a value,
 * because unavailable, pending, and failed sources genuinely participate in an
 * evaluated world. A cut that recorded only the sources that answered would
 * describe a world nobody evaluated, and would silently become reproducible by
 * forgetting what went wrong.
 *
 * The observed value is addressed rather than inlined: a cut is an immutable
 * coordinate, and a coordinate that embeds its payloads cannot be compared
 * without comparing everything it saw.
 */
export interface EvidenceObservation<
  Id extends EvidenceObservationId = EvidenceObservationId,
  Source extends EvidenceSourceId = EvidenceSourceId,
> {
  readonly id: EvidenceObservationReference<Id>;
  readonly source: EvidenceReference<Source>;
  readonly state: Evidence<ContentAddress>;
  readonly observedAt: TimeCoordinate;
  readonly version?: ContentAddress;
}

export type EvidenceCutId<Name extends string = string> = Brand<Name, 'liteship.evidence-cut-id'>;
export type EvidenceCutReference<Id extends EvidenceCutId = EvidenceCutId> = Reference<
  'evidence-cut',
  Id
>;

/**
 * The immutable evidence population one evaluation saw.
 *
 * The observation population may be empty — a program that consults no evidence
 * source is an ordinary program, not a degenerate one — but it may not be
 * absent, because "this evaluation consulted nothing" and "nobody recorded what
 * this evaluation consulted" are different claims and only one of them is
 * reproducible.
 */
export interface EvidenceCut<Id extends EvidenceCutId = EvidenceCutId> {
  readonly id: EvidenceCutReference<Id>;
  readonly observations: readonly EvidenceObservation[];
  readonly address: ContentAddress<'application/vnd.liteship.evidence-cut+cbor'>;
}

// ---------------------------------------------------------------------------
// Reproducibility claims
// ---------------------------------------------------------------------------

/**
 * What one physical stage claims about re-emitting its own output.
 *
 * Parameterized over a profile *reference* rather than a profile product. A
 * claim carried inside the profile it names, parameterized by that same
 * profile, is a type that contains itself; and a claim that inlines its profile
 * cannot be compared without comparing the entire configuration it describes.
 *
 * `unclaimed` is the honest default and it carries limitations, because absent
 * evidence is not a negative finding. Calling unproven output non-reproducible
 * is the same error as calling an unmapped artifact unmappable — it converts
 * "we did not measure" into "we measured, and it varies".
 */
export type ReproducibilityClaim<Profile> = Algebra<{
  unclaimed: { readonly limitations: NonEmptyTuple<Diagnostic> };
  'reproducible-under-profile': {
    readonly profile: Profile;
    readonly witness: ContentAddress<'application/vnd.liteship.reproducibility-witness+cbor'>;
  };
  'observed-variable': {
    readonly profile: Profile;
    readonly evidence: ContentAddress<'application/vnd.liteship.reproducibility-variance+cbor'>;
  };
}>;

/** A literal profile carrier, so the laws below compare something real. */
type ReproLawProfile = Reference<'law-profile', Brand<'liteship.law.profile-a', 'liteship.law-profile'>>;

/**
 * Compile-time law: the three arms carry three different obligations, and no
 * arm may borrow another's evidence.
 *
 * Each member is compared individually rather than as one whole-algebra
 * comparison, because a whole-shape comparison stays green while an individual
 * arm quietly acquires or loses a member.
 */
export type AReproducibilityClaimSeparatesItsThreeArms = Assert<
  Equal<
    [
      TagOf<ReproducibilityClaim<ReproLawProfile>>,
      keyof CaseOf<ReproducibilityClaim<ReproLawProfile>, 'unclaimed'>,
      keyof CaseOf<ReproducibilityClaim<ReproLawProfile>, 'reproducible-under-profile'>,
      keyof CaseOf<ReproducibilityClaim<ReproLawProfile>, 'observed-variable'>,
    ],
    [
      'unclaimed' | 'reproducible-under-profile' | 'observed-variable',
      '_tag' | 'limitations',
      '_tag' | 'profile' | 'witness',
      '_tag' | 'profile' | 'evidence',
    ]
  >
>;

/**
 * Compile-time law: an unclaimed result names no profile and holds no witness.
 *
 * This is the arm a stage reaches for when it has measured nothing, so it is
 * the arm most likely to be quietly upgraded into a free reproducibility claim.
 */
export type AnUnclaimedResultCannotCarryAWitness = Assert<
  Equal<
    [
      'witness' extends keyof CaseOf<ReproducibilityClaim<ReproLawProfile>, 'unclaimed'> ? true : false,
      'profile' extends keyof CaseOf<ReproducibilityClaim<ReproLawProfile>, 'unclaimed'> ? true : false,
      'evidence' extends keyof CaseOf<ReproducibilityClaim<ReproLawProfile>, 'unclaimed'> ? true : false,
      // And the limitations must be a non-empty population. A member that
      // accepts `[]` lets "unclaimed" mean "we have nothing to say about why we
      // have nothing to say", which is the silence this arm exists to prevent.
      readonly Diagnostic[] extends CaseOf<
        ReproducibilityClaim<ReproLawProfile>,
        'unclaimed'
      >['limitations']
        ? true
        : false,
    ],
    [false, false, false, false]
  >
>;

/**
 * Compile-time law: a claim is exact over the profile it names, and a claim
 * made under one profile cannot substitute for the same claim under another.
 */
export type AReproducibilityClaimIsExactOverItsProfile = Assert<
  Equal<
    [
      ReproducibilityClaim<ReproLawProfile> extends ReproducibilityClaim<ReproLawProfileB> ? true : false,
      ReproducibilityClaim<ReproLawProfile> extends ReproducibilityClaim<ReproLawProfile> ? true : false,
    ],
    [false, true]
  >
>;

/** A second literal profile carrier, distinct from the first. */
type ReproLawProfileB = Reference<'law-profile', Brand<'liteship.law.profile-b', 'liteship.law-profile'>>;

/**
 * Compile-time law: an observation retains the whole operational state algebra.
 *
 * Narrowing the contributed state to the ready arm would make every cut look
 * complete, which is exactly the shape that turns a partial evaluation into a
 * confident reproducibility claim.
 */
export type AnObservationRetainsUnavailableAndFailedStates = Assert<
  Equal<
    [
      TagOf<EvidenceObservation['state']>,
      EvidenceObservation['observedAt'] extends TimeCoordinate ? true : false,
    ],
    ['unavailable' | 'pending' | 'ready' | 'failed', true]
  >
>;

/**
 * Compile-time law: a cut is exact over its identity and is addressed.
 *
 * Written against literal carriers rather than the alias compared with itself,
 * because the self-comparison survives deletion of the type parameter.
 */
export type AnEvidenceCutIsExactOverItsIdentity = Assert<
  Equal<
    [
      EvidenceCutReference<EvidenceCutId<'liteship.law.cut-a'>> extends EvidenceCutReference<
        EvidenceCutId<'liteship.law.cut-b'>
      >
        ? true
        : false,
      EvidenceCutReference<EvidenceCutId<'liteship.law.cut-a'>> extends EvidenceCutReference<
        EvidenceCutId<'liteship.law.cut-a'>
      >
        ? true
        : false,
      // Read through the cut rather than off the reference alias. Comparing the
      // alias with itself still passes once the cut stops threading its own
      // parameter — the parameter simply becomes unused, and an unused type
      // parameter is a hygiene death no named law can attribute.
      EvidenceCut<EvidenceCutId<'liteship.law.cut-a'>>['id'],
      EvidenceCut['address'] extends ContentAddress<'application/vnd.liteship.evidence-cut+cbor'>
        ? true
        : false,
    ],
    [
      false,
      true,
      EvidenceCutReference<EvidenceCutId<'liteship.law.cut-a'>>,
      true,
    ]
  >
>;

/** Type summary consumed by the root core topology. */
export interface EvidenceTypeSurface {
  readonly truth: Truth;
  readonly evidence: Evidence<unknown>;
  readonly source: EvidenceSourceDefinition;
  readonly proposition: EvidenceProposition;
  readonly decision: Decision;
  readonly update: EvidenceUpdate;
  readonly foreignAdapter: ForeignEvidenceAdapter;
  readonly observation: EvidenceObservation;
  readonly cut: EvidenceCut;
  readonly reproducibility: ReproducibilityClaim<unknown>;
}
