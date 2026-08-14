/**
 * Compile-time laws for `00_core/10_collection`.
 *
 * A law is a fixture about the specification, not part of it. Root states the
 * reason and this file applies it: a fixture living in a declaration file
 * becomes part of that file's addressed public type surface, so the proofs live
 * beside the declarations they constrain rather than inside them.
 *
 * Nothing imports this file. It emits no JavaScript and exports no value.
 *
 * @module
 */

import type { Assert, Equal } from '../../types.js';
import type { FieldReference, SchemaId } from '../03_schema/types.js';
import type { CollectionChange, CollectionDefinition, CollectionValueExpression, JoinCondition, RowKey, SortTerm } from './types.js';

/** Compile-time law: a raw collation string cannot satisfy deterministic sort semantics. */
export type CollectionRejectsStringCollation = Assert<
  Equal<string extends NonNullable<SortTerm['collation']> ? true : false, false>
>;


/** Compile-time law: collection keys are schema-derived references, not raw strings. */
export type CollectionKeyRejectsRawString = Assert<
  Equal<string extends CollectionDefinition['key'] ? true : false, false>
>;


type CustomerRowSchemaId = SchemaId<'customer-row'>;

type OrderRowSchemaId = SchemaId<'order-row'>;

type CustomerKeySchemaId = SchemaId<'customer-key'>;

type CustomerCollection = CollectionDefinition<
  CustomerRowSchemaId,
  CustomerKeySchemaId,
  Readonly<{ id: string }>,
  Readonly<{ id: string }>,
  string
>;

type ForeignCollectionKey = FieldReference<OrderRowSchemaId, CustomerKeySchemaId, string>;

type OrderNameSchemaId = SchemaId<'order-name'>;

type CustomerJoinField = FieldReference<CustomerRowSchemaId, CustomerKeySchemaId, string>;

type OrderJoinField = FieldReference<OrderRowSchemaId, OrderNameSchemaId, string>;

type ForeignCollectionFieldExpression = {
  readonly _tag: 'field';
  readonly field: OrderJoinField;
};

type ForeignCollectionUpdate = {
  readonly _tag: 'update';
  readonly key: RowKey<string>;
  readonly fields: readonly [{
    readonly field: OrderJoinField;
    readonly value: string;
  }];
};


/** Compile-time law: a field from another row schema cannot be the collection key. */
export type CollectionKeyRejectsForeignSchema = Assert<
  Equal<ForeignCollectionKey extends CustomerCollection['key'] ? true : false, false>
>;


/** Compile-time law: query value expressions cannot read a foreign row schema. */
export type CollectionExpressionRejectsForeignSchema = Assert<
  Equal<
    ForeignCollectionFieldExpression extends CollectionValueExpression<CustomerRowSchemaId, string>
      ? true
      : false,
    false
  >
>;


/** Compile-time law: collection patches cannot update fields from another row schema. */
export type CollectionPatchRejectsForeignSchema = Assert<
  Equal<
    ForeignCollectionUpdate extends CollectionChange<CustomerRowSchemaId, Readonly<{ id: string }>>
      ? true
      : false,
    false
  >
>;


type ReversedJoinCondition = {
  readonly left: OrderJoinField;
  readonly right: CustomerJoinField;
};


/** Compile-time law: a join condition preserves its declared left and right roots. */
export type CollectionJoinRejectsReversedRoots = Assert<
  Equal<
    ReversedJoinCondition extends JoinCondition<CustomerRowSchemaId, OrderRowSchemaId>
      ? true
      : false,
    false
  >
>;
