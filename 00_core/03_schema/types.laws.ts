/**
 * Compile-time laws for `00_core/03_schema`.
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

import type { Assert, DataPath, Equal, IsNever } from '../../types.js';
import type { ComposeFieldReferences, FieldPath, FieldReference, ObjectSchema, ReferenceSchema, Schema, SchemaFieldSpec, SchemaId, SchemaReference } from './types.js';

type CustomerSchemaId = SchemaId<'customer'>;

type OrderSchemaId = SchemaId<'order'>;

type AgeSchemaId = SchemaId<'age'>;

type RecursiveNodeSchemaId = SchemaId<'recursive-node'>;

type RecursiveLabelSchemaId = SchemaId<'recursive-label'>;

type RecursiveNodeValue = Readonly<{ label: string }>;

type RecursiveNodeReferenceSchema = ReferenceSchema<
  RecursiveNodeValue,
  RecursiveNodeValue,
  RecursiveNodeSchemaId
>;

type RecursiveRootFieldMap = Readonly<{
  next: SchemaFieldSpec<RecursiveNodeReferenceSchema, true>;
}>;

type RecursiveRootObjectSchema = ObjectSchema<CustomerSchemaId, RecursiveRootFieldMap>;


/** Compile-time law: an unbranded runtime path cannot satisfy a field path. */
export type FieldPathRejectsRawDataPath = Assert<
  Equal<DataPath extends FieldPath<CustomerSchemaId, AgeSchemaId> ? true : false, false>
>;


/** Compile-time law: paths rooted in different schemas are not interchangeable. */
export type FieldPathRejectsForeignRoot = Assert<
  Equal<
    FieldPath<CustomerSchemaId, AgeSchemaId> extends FieldPath<OrderSchemaId, AgeSchemaId>
      ? true
      : false,
    false
  >
>;


type CustomerFieldMap = Readonly<{
  age: SchemaFieldSpec<Schema<number, number, AgeSchemaId>, true>;
  path: SchemaFieldSpec<Schema<string, string, SchemaId<'customer-path'>>, false>;
}>;

type CustomerObjectSchema = ObjectSchema<CustomerSchemaId, CustomerFieldMap>;


/** Compile-time law: direct property navigation returns a typed field reference. */
export type ObjectSchemaDirectNavigationIsTyped = Assert<
  Equal<CustomerObjectSchema['age']['path'], FieldPath<CustomerSchemaId, AgeSchemaId, readonly ['age']>>
>;


/** Compile-time law: reserved carrier names remain reachable only through `.fields`. */
export type ObjectSchemaReservedFieldUsesCollisionSafeView = Assert<
  Equal<
    CustomerObjectSchema['fields']['path']['path'],
    FieldPath<CustomerSchemaId, SchemaId<'customer-path'>, readonly ['path']>
  >
>;


/** Compile-time law: named references expose their target without infinite direct expansion. */
export type NamedReferenceStopsImplicitFieldExpansion = Assert<
  Equal<'label' extends keyof RecursiveRootObjectSchema['next'] ? true : false, false>
>;


/** Compile-time law: the explicit named-reference target remains typed and inspectable. */
export type NamedReferenceExposesTypedTarget = Assert<
  Equal<
    RecursiveRootObjectSchema['next']['reference'],
    SchemaReference<RecursiveNodeSchemaId, RecursiveNodeValue, RecursiveNodeValue>
  >
>;


type RecursiveEdgeReference = FieldReference<
  CustomerSchemaId,
  RecursiveNodeSchemaId,
  RecursiveNodeValue,
  RecursiveNodeValue,
  readonly ['next']
>;

type RecursiveLabelReference = FieldReference<
  RecursiveNodeSchemaId,
  RecursiveLabelSchemaId,
  string,
  string,
  readonly ['label']
>;

type ForeignRecursiveLabelReference = FieldReference<
  OrderSchemaId,
  RecursiveLabelSchemaId,
  string,
  string,
  readonly ['label']
>;


/** Compile-time law: explicit composition crosses a named reference exactly once. */
export type FieldReferenceCompositionCrossesNamedReference = Assert<
  Equal<
    ComposeFieldReferences<RecursiveEdgeReference, RecursiveLabelReference>['path'],
    FieldPath<CustomerSchemaId, RecursiveLabelSchemaId, readonly ['next', 'label']>
  >
>;


/** Compile-time law: a field rooted in another schema cannot satisfy a reference hop. */
export type FieldReferenceCompositionRejectsForeignRoot = Assert<
  IsNever<ComposeFieldReferences<RecursiveEdgeReference, ForeignRecursiveLabelReference>>
>;
