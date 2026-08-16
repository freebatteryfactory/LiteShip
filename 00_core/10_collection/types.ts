/**
 * Keyed semantic collections, typed relational expressions, and differential
 * derivation.
 *
 * Collection meaning is independent from whether execution uses persistent
 * records, indexes, dense columns, SQL, JavaScript, WebAssembly, workers, GPU
 * kernels, or host storage. Rows live in a WorldRevision; this home owns the
 * collection definition, query algebra, family patch, and materialized view.
 *
 * @module
 */

import type {
  Algebra,
  Brand,
  NonEmptyTuple,
  Reference,
} from '../../types.js';
import type { CanonicalValue, ContentAddress } from '../01_encoding/types.js';
import type { EntityReference, RevisionReference, WorldReference } from '../02_identity/types.js';
import type { FieldReference, SchemaId, SchemaReference } from '../03_schema/types.js';
import type { EvidencePredicate, Proposition } from '../06_evidence/types.js';
import type {
  ComponentId,
  ComponentReference,
  IndexReference,
  RevisionPatch,
} from '../08_state/types.js';

/** Stable identity for one collection. */
export type CollectionId<Name extends string = string> = Brand<Name, 'liteship.collection-id'>;
/** Stable identity for one collection query. */
export type CollectionQueryId<Name extends string = string> = Brand<Name, 'liteship.collection-query-id'>;
/** Stable identity for one query parameter. */
export type QueryParameterId<Name extends string = string> = Brand<Name, 'liteship.query-parameter-id'>;
/** Stable identity for one collation. */
export type CollationId<Name extends string = string> = Brand<Name, 'liteship.collation-id'>;
/** Type-level representation of row key. */
export type RowKey<Value extends string | number = string | number> = Brand<Value, 'liteship.row-key'>;
/** Typed reference to one collection. */
export type CollectionReference<
  Id extends CollectionId = CollectionId,
  RowRoot extends SchemaId = SchemaId,
> = Brand<Reference<'collection', Id>, readonly ['liteship.collection-reference', RowRoot]>;
/** Typed reference to one collection query. */
export type CollectionQueryReference<Id extends CollectionQueryId = CollectionQueryId> = Reference<'collection-query', Id>;
/** Typed reference to one query parameter. */
export type QueryParameterReference<Id extends QueryParameterId = QueryParameterId> = Reference<'query-parameter', Id>;
/** Typed reference to one collation. */
export type CollationReference<Id extends CollationId = CollationId> = Reference<'collation', Id>;

/** Deterministic text comparison profile. Unsupported backends must refuse rather than approximate silently. */
export interface CollationDefinition {
  readonly id: CollationId;
  readonly locale: string;
  readonly usage: 'sort' | 'search';
  readonly sensitivity: 'base' | 'accent' | 'case' | 'variant';
  readonly caseFirst: 'upper' | 'lower' | 'false';
  readonly numeric: boolean;
  readonly ignorePunctuation: boolean;
  readonly normalization: 'none' | 'NFC' | 'NFD' | 'NFKC' | 'NFKD';
  readonly address: ContentAddress<'application/vnd.liteship.collation+cbor'>;
}

/** Immutable collection definition. Current rows remain in a WorldRevision. */
export interface CollectionDefinition<
  RowSchemaId extends SchemaId = SchemaId,
  KeySchemaId extends SchemaId = SchemaId,
  Row extends CanonicalValue = CanonicalValue,
  EncodedRow extends CanonicalValue = Row,
  KeyValue extends string | number = string | number,
> {
  readonly id: CollectionId;
  readonly world: WorldReference;
  readonly rowComponent: ComponentReference<ComponentId, Row, EncodedRow>;
  readonly rowSchema: SchemaReference<RowSchemaId, Row, EncodedRow>;
  readonly key: FieldReference<RowSchemaId, KeySchemaId, KeyValue>;
  readonly indexes: readonly IndexReference[];
  readonly address: ContentAddress<'application/vnd.liteship.collection+cbor'>;
}

/** Typed value expression rooted in the schemas visible to one collection query. */
export type CollectionValueExpression<
  Root extends SchemaId = SchemaId,
  Value = unknown,
> = Algebra<{
  field: { readonly field: FieldReference<Root, SchemaId, Value> };
  literal: { readonly value: Value & CanonicalValue; readonly schema: SchemaReference<SchemaId, Value> };
  parameter: { readonly parameter: QueryParameterReference; readonly schema: SchemaReference<SchemaId, Value> };
  coalesce: {
    readonly values: NonEmptyTuple<CollectionValueExpression<Root, Value>>;
    readonly fallback: CollectionValueExpression<Root, Value>;
  };
}>;

/** Collection-specific atomic predicate. Logical composition is owned by Evidence.Proposition. */
export type CollectionPredicateAtom<Root extends SchemaId = SchemaId> = Algebra<{
  equals: {
    readonly left: CollectionValueExpression<Root>;
    readonly right: CollectionValueExpression<Root>;
  };
  compare: {
    readonly left: CollectionValueExpression<Root>;
    readonly operator: '<' | '<=' | '>' | '>=';
    readonly right: CollectionValueExpression<Root>;
  };
  'is-null': { readonly value: CollectionValueExpression<Root> };
  'is-missing': { readonly value: CollectionValueExpression<Root> };
  in: {
    readonly value: CollectionValueExpression<Root>;
    readonly values: NonEmptyTuple<CollectionValueExpression<Root>>;
  };
  matches: {
    readonly value: CollectionValueExpression<Root, string>;
    readonly pattern: string;
    readonly flags?: string;
  };
}>;

/**
 * Three-valued collection predicate. Collection atoms and evidence atoms share
 * Strong Kleene not/and/or without becoming the same domain vocabulary.
 */
export type CollectionPredicate<Root extends SchemaId = SchemaId> = Proposition<
  CollectionPredicateAtom<Root> | EvidencePredicate
>;

/** Deterministic sort term. */
export interface SortTerm<Root extends SchemaId = SchemaId> {
  readonly value: CollectionValueExpression<Root>;
  readonly direction: 'ascending' | 'descending';
  readonly nulls: 'first' | 'last';
  readonly collation?: CollationReference;
}

/** Join cardinality constrains the inferred output shape. */
export type JoinCardinality = 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';

/** One equality join condition. */
export interface JoinCondition<
  LeftRoot extends SchemaId = SchemaId,
  RightRoot extends SchemaId = SchemaId,
> {
  readonly left: FieldReference<LeftRoot>;
  readonly right: FieldReference<RightRoot>;
}

/** Side-specific join payload used by typed authoring constructors. */
export interface JoinExpression<
  LeftRoot extends SchemaId = SchemaId,
  RightRoot extends SchemaId = SchemaId,
> {
  readonly left: CollectionQueryExpression<LeftRoot>;
  readonly right: CollectionQueryExpression<RightRoot>;
  readonly on: NonEmptyTuple<JoinCondition<LeftRoot, RightRoot>>;
  readonly kind: 'inner' | 'left' | 'right' | 'full';
  readonly cardinality: JoinCardinality;
}

/** Standard aggregate functions. */
export type AggregateFunction<Root extends SchemaId = SchemaId> = Algebra<{
  count: Record<never, never>;
  sum: { readonly value: CollectionValueExpression<Root, number> };
  minimum: { readonly value: CollectionValueExpression<Root> };
  maximum: { readonly value: CollectionValueExpression<Root> };
  average: { readonly value: CollectionValueExpression<Root, number> };
  first: { readonly value: CollectionValueExpression<Root> };
  last: { readonly value: CollectionValueExpression<Root> };
}>;

/** Named aggregate output. */
export interface AggregateOutput<Root extends SchemaId = SchemaId> {
  readonly name: string;
  readonly function: AggregateFunction<Root>;
  readonly schema: SchemaReference;
}

/**
 * Inspectable relational-algebra expression over one declared set of row roots.
 *
 * A simple source carries one root. A join may widen the stored expression's
 * root parameter to the union of its inputs; typed authoring constructors use
 * `JoinExpression<LeftRoot, RightRoot>` to retain side-specific conditions.
 */
export type CollectionQueryExpression<Roots extends SchemaId = SchemaId> = Algebra<{
  source: { readonly collection: CollectionReference<CollectionId, Roots> };
  filter: {
    readonly input: CollectionQueryExpression<Roots>;
    readonly predicate: CollectionPredicate<Roots>;
  };
  project: {
    readonly input: CollectionQueryExpression<Roots>;
    readonly fields: NonEmptyTuple<FieldReference<Roots>>;
  };
  sort: {
    readonly input: CollectionQueryExpression<Roots>;
    readonly terms: NonEmptyTuple<SortTerm<Roots>>;
    /** Stable row key appended as the final deterministic tie-breaker. */
    readonly tieBreaker: FieldReference<Roots>;
  };
  group: {
    readonly input: CollectionQueryExpression<Roots>;
    readonly fields: NonEmptyTuple<FieldReference<Roots>>;
  };
  aggregate: {
    readonly input: CollectionQueryExpression<Roots>;
    readonly groups: readonly FieldReference<Roots>[];
    readonly outputs: NonEmptyTuple<AggregateOutput<Roots>>;
  };
  join: JoinExpression<Roots, Roots>;
  distinct: {
    readonly input: CollectionQueryExpression<Roots>;
    readonly fields: NonEmptyTuple<FieldReference<Roots>>;
  };
  window: { readonly input: CollectionQueryExpression<Roots>; readonly offset: number; readonly limit: number };
}>;

/** Addressed immutable query definition. */
export interface CollectionQuery<Roots extends SchemaId = SchemaId> {
  readonly id: CollectionQueryId;
  readonly expression: CollectionQueryExpression<Roots>;
  readonly outputSchema: SchemaReference;
  readonly address: ContentAddress<'application/vnd.liteship.collection-query+cbor'>;
}

/** One unambiguous relative position in a keyed collection. */
export type RowPosition = Algebra<{
  first: Record<never, never>;
  last: Record<never, never>;
  before: { readonly key: RowKey };
  after: { readonly key: RowKey };
}>;

/** Keyed semantic collection change rooted in one collection row schema. */
export type CollectionChange<
  RowRoot extends SchemaId = SchemaId,
  Row = CanonicalValue,
> = Algebra<{
  insert: { readonly key: RowKey; readonly row: Row; readonly position?: RowPosition };
  replace: { readonly key: RowKey; readonly row: Row };
  update: {
    readonly key: RowKey;
    readonly fields: NonEmptyTuple<{
      readonly field: FieldReference<RowRoot>;
      readonly value: CanonicalValue;
    }>;
  };
  delete: { readonly key: RowKey };
  move: { readonly key: RowKey; readonly position: RowPosition };
}>;

/** Family-specific patch lowered into normalized state changes before commit. */
export type CollectionPatch<
  RowRoot extends SchemaId = SchemaId,
  Row = CanonicalValue,
> = RevisionPatch<'collection', CollectionChange<RowRoot, Row>>;

/** One row in a materialized view. */
export interface CollectionRow<Row = unknown> {
  readonly entity: EntityReference;
  readonly key: RowKey;
  readonly value: Row;
}

/** Materialized query result pinned to a source revision. */
export interface CollectionView<Row = unknown> {
  readonly query: CollectionQueryReference;
  readonly sourceRevision: RevisionReference;
  readonly rows: readonly CollectionRow<Row>[];
  readonly address: ContentAddress<'application/vnd.liteship.collection-view+cbor'>;
}

/** Type summary consumed by the root core topology. */
export interface CollectionTypeSurface {
  readonly definition: CollectionDefinition;
  readonly collation: CollationDefinition;
  readonly value: CollectionValueExpression;
  readonly predicate: CollectionPredicate;
  readonly join: JoinExpression;
  readonly query: CollectionQuery;
  readonly patch: CollectionPatch;
  readonly view: CollectionView;
}
