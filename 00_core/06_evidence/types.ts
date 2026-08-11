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

import type { Algebra, Brand, Hole, NonEmptyTuple, Reference, RequirementRow } from '../../types.js';
import type { Diagnostic } from '../00_error/types.js';
import type { CanonicalValue } from '../01_encoding/types.js';
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

/** Type summary consumed by the root core topology. */
export interface EvidenceTypeSurface {
  readonly truth: Truth;
  readonly evidence: Evidence<unknown>;
  readonly source: EvidenceSourceDefinition;
  readonly proposition: EvidenceProposition;
  readonly decision: Decision;
  readonly update: EvidenceUpdate;
  readonly foreignAdapter: ForeignEvidenceAdapter;
}
