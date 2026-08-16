/**
 * Evidence state, three-valued truth, authority, and inspectable propositions.
 *
 * Operational state and epistemic uncertainty are separate. Failure never
 * silently becomes pending, false, or outstanding. The logical proposition
 * algebra is generic so collections, policies, and other domains reuse one
 * Strong Kleene implementation rather than inventing parallel boolean systems.
 *
 * @module
 */

import type {
  Algebra,
  Brand,
  Hole,
  NonEmptyTuple,
  Reference,
  RequirementRow,
} from '../../types.js';
import type { Diagnostic } from '../00_error/types.js';
import type { CanonicalValue, ContentAddress } from '../01_encoding/types.js';
import type { SchemaId, SchemaReference } from '../03_schema/types.js';
import type { TimeCoordinate } from '../04_time/types.js';

/**
 * Kleene three-valued truth.
 *
 * `pending` is epistemic: admitted evidence has not determined the proposition's
 * truth. Operational work that is owed or in flight is `Evidence.outstanding`;
 * the two words never substitute for one another.
 */
export type Truth = 'true' | 'false' | 'pending';

/** Canonical Strong Kleene negation table. */
export interface TruthNegationTable {
  readonly true: 'false';
  readonly false: 'true';
  readonly pending: 'pending';
}

/** Canonical Strong Kleene conjunction table, indexed left operand then right. */
export interface TruthConjunctionTable {
  readonly true: {
    readonly true: 'true';
    readonly false: 'false';
    readonly pending: 'pending';
  };
  readonly false: {
    readonly true: 'false';
    readonly false: 'false';
    readonly pending: 'false';
  };
  readonly pending: {
    readonly true: 'pending';
    readonly false: 'false';
    readonly pending: 'pending';
  };
}

/** Canonical Strong Kleene disjunction table, indexed left operand then right. */
export interface TruthDisjunctionTable {
  readonly true: {
    readonly true: 'true';
    readonly false: 'true';
    readonly pending: 'true';
  };
  readonly false: {
    readonly true: 'true';
    readonly false: 'false';
    readonly pending: 'pending';
  };
  readonly pending: {
    readonly true: 'true';
    readonly false: 'pending';
    readonly pending: 'pending';
  };
}

/** Strong Kleene negation, derived from the canonical table. */
export type TruthNot<Value extends Truth> = TruthNegationTable[Value];

/** Strong Kleene conjunction, derived from the canonical table. */
export type TruthAnd<Left extends Truth, Right extends Truth> =
  TruthConjunctionTable[Left][Right];

/** Strong Kleene disjunction, derived from the canonical table. */
export type TruthOr<Left extends Truth, Right extends Truth> =
  TruthDisjunctionTable[Left][Right];

/** Operational state of an evidence source. */
export type Evidence<Value, Failure = readonly Diagnostic[]> = Algebra<{
  unavailable: { readonly reason?: string };
  outstanding: { readonly since?: TimeCoordinate };
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
  outstanding: { readonly subject: Subject; readonly since?: TimeCoordinate };
  pending: { readonly subject?: Subject; readonly reason?: string };
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
 * because unavailable, outstanding, and failed sources genuinely participate
 * in an evaluated world. A cut that recorded only the sources that answered would
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
