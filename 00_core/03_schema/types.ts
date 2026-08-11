/**
 * LiteShip-native schema algebra, schema-derived field references, and
 * representation contracts.
 *
 * The root supplies Port, Result, Issue, paths, brands, and algebraic shape.
 * This home supplies the concrete schema language that decodes external
 * representations into semantic values and derives faithful downstream
 * projections. A schema-derived field reference carries compile-time type,
 * runtime path, schema identity, content identity, and a future dense slot from
 * one canonical value.
 *
 * @module
 */

import type {
  Algebra,
  Assert,
  Brand,
  DataPath,
  EncodedOf,
  Equal,
  Issue,
  IsNever,
  Port,
  Reference,
  Result,
  TypeOf,
} from '../../types.js';
import type { Diagnostic } from '../00_error/types.js';
import type { CanonicalValue, ContentAddress, MediaType } from '../01_encoding/types.js';
import type { EntityReference } from '../02_identity/types.js';

/** Stable identity of one named schema definition. Literal names remain distinct. */
export type SchemaId<Name extends string = string> = Brand<Name, 'liteship.schema-id'>;

/** Immutable address of one exact schema document. */
export type SchemaAddress = ContentAddress<'application/vnd.liteship.schema+cbor'>;

/**
 * Typed reference to a schema definition, including recursive references.
 * The reference preserves decoded and encoded types without carrying the full
 * schema graph through every relationship.
 */
export type SchemaReference<
  Id extends SchemaId = SchemaId,
  Value = unknown,
  Encoded = Value,
> = Reference<'schema', Id> & Port<Value, Encoded>;

/**
 * Typed runtime path from one root schema to one target schema.
 * The carrier is a real serializable DataPath; the brand binds root and target.
 */
export type FieldPath<
  Root extends SchemaId = SchemaId,
  Target extends SchemaId = SchemaId,
  Segments extends DataPath = DataPath,
> = Brand<Segments, readonly ['liteship.field-path', Root, Target]>;

/**
 * One schema-derived field reference. It is simultaneously a typed Port, a
 * serializable path, a schema reference, and a content-addressable semantic key.
 * FieldTree views additionally compose the target Schema itself onto this value.
 */
export interface FieldReference<
  Root extends SchemaId = SchemaId,
  Target extends SchemaId = SchemaId,
  Value = unknown,
  Encoded = Value,
  Segments extends DataPath = DataPath,
> extends Port<Value, Encoded> {
  readonly rootSchema: SchemaReference<Root>;
  readonly targetSchema: SchemaReference<Target, Value, Encoded>;
  readonly path: FieldPath<Root, Target, Segments>;
  readonly address: ContentAddress<'application/vnd.liteship.field-reference+cbor'>;
}

/** A schema-derived field bound to one persistent semantic entity. */
export interface EntityFieldReference<
  Entity extends EntityReference = EntityReference,
  Root extends SchemaId = SchemaId,
  Target extends SchemaId = SchemaId,
  Value = unknown,
  Encoded = Value,
  Segments extends DataPath = DataPath,
> {
  readonly entity: Entity;
  readonly field: FieldReference<Root, Target, Value, Encoded, Segments>;
}

/** Root schema identity carried by one field reference. */
export type FieldRootOf<Value extends FieldReference> = Value extends FieldReference<
  infer Root,
  SchemaId,
  unknown,
  unknown,
  DataPath
>
  ? Root
  : never;

/** Target schema identity carried by one field reference. */
export type FieldTargetOf<Value extends FieldReference> = Value extends FieldReference<
  SchemaId,
  infer Target,
  unknown,
  unknown,
  DataPath
>
  ? Target
  : never;

/** Runtime path segments carried by one field reference. */
export type FieldSegmentsOf<Value extends FieldReference> = Value extends FieldReference<
  SchemaId,
  SchemaId,
  unknown,
  unknown,
  infer Segments
>
  ? Segments
  : never;

/**
 * Compose two field references across an explicit schema boundary.
 *
 * The outer target must be the inner root. This is the finite, inspectable way
 * to traverse a named recursive reference without eagerly materializing an
 * infinite property tree.
 */
export type ComposeFieldReferences<
  Outer extends FieldReference,
  Inner extends FieldReference,
> = Equal<FieldTargetOf<Outer>, FieldRootOf<Inner>> extends true
  ? FieldReference<
      FieldRootOf<Outer>,
      FieldTargetOf<Inner>,
      TypeOf<Inner>,
      EncodedOf<Inner>,
      readonly [...FieldSegmentsOf<Outer>, ...FieldSegmentsOf<Inner>]
    >
  : never;

/** Metadata available to forms, documentation, policy, and agents. */
export interface SchemaMetadata {
  readonly title?: string;
  readonly description?: string;
  readonly deprecated?: boolean;
  readonly sensitive?: boolean;
  readonly purpose?: readonly string[];
  readonly examples?: readonly CanonicalValue[];
}

/** Declarative constraints whose meaning can be projected and tested. */
export type SchemaConstraint = Algebra<{
  minimum: { readonly value: number; readonly exclusive?: boolean };
  maximum: { readonly value: number; readonly exclusive?: boolean };
  'multiple-of': { readonly value: number };
  'min-length': { readonly value: number };
  'max-length': { readonly value: number };
  pattern: { readonly source: string; readonly flags?: string };
  format: { readonly name: string };
  'min-items': { readonly value: number };
  'max-items': { readonly value: number };
  'unique-items': Record<never, never>;
}>;

/** Explicit named adapter for a refinement not representable declaratively. */
export interface OpaqueRefinementReference {
  readonly adapter: Brand<string, 'liteship.schema-refinement-adapter'>;
  readonly explanation: string;
  readonly portable: false;
}

/** One field in the canonical object-schema document. */
export interface SchemaField {
  readonly name: string;
  readonly schema: SchemaReference;
  readonly required: boolean;
  readonly default?: CanonicalValue;
  readonly metadata?: SchemaMetadata;
}

/** Closed canonical schema-node vocabulary. */
export type SchemaNode = Algebra<{
  unknown: Record<never, never>;
  null: Record<never, never>;
  boolean: Record<never, never>;
  integer: { readonly constraints?: readonly SchemaConstraint[] };
  number: { readonly constraints?: readonly SchemaConstraint[] };
  string: { readonly constraints?: readonly SchemaConstraint[] };
  literal: { readonly value: CanonicalValue };
  enum: { readonly values: readonly CanonicalValue[] };
  array: { readonly element: SchemaReference; readonly constraints?: readonly SchemaConstraint[] };
  tuple: { readonly elements: readonly SchemaReference[]; readonly rest?: SchemaReference };
  object: { readonly fields: readonly SchemaField[]; readonly unknownFields: 'reject' | 'strip' | 'preserve' };
  record: { readonly key: SchemaReference; readonly value: SchemaReference };
  union: { readonly members: readonly SchemaReference[] };
  'discriminated-union': {
    readonly field: FieldPath;
    readonly members: Readonly<Record<string, SchemaReference>>;
  };
  bytes: { readonly mediaType: MediaType; readonly length?: number };
  reference: { readonly target: SchemaReference };
  refinement: {
    readonly base: SchemaReference;
    readonly constraints: readonly SchemaConstraint[];
    readonly opaque?: OpaqueRefinementReference;
  };
  transform: {
    readonly encoded: SchemaReference;
    readonly decoded: SchemaReference;
    readonly codec: Brand<string, 'liteship.schema-codec'>;
  };
}>;

/** One named definition in a finite schema graph. */
export interface SchemaDefinitionNode<Id extends SchemaId = SchemaId> {
  readonly id: Id;
  readonly node: SchemaNode;
  readonly metadata?: SchemaMetadata;
}

/** Canonical finite schema graph with explicit references and a root. */
export interface SchemaDocument<
  Root extends SchemaId = SchemaId,
  Value = unknown,
  Encoded = Value,
> {
  readonly root: SchemaReference<Root, Value, Encoded>;
  readonly definitions: readonly SchemaDefinitionNode[];
  readonly address: SchemaAddress;
}

// Private compile-time descriptor. Runtime authenticity remains with the
// constructor's private witness/registry; this slot prevents public structural
// construction without reserving ordinary field names such as `id` or `value`.
declare const SchemaDetailsSlot: unique symbol;

/** Descriptor recoverable by type operators without becoming authoring surface. */
interface SchemaDetails<Id extends SchemaId, Value, Encoded> {
  readonly id: Id;
  readonly reference: SchemaReference<Id, Value, Encoded>;
  readonly document: SchemaDocument<Id, Value, Encoded>;
  readonly root: FieldReference<Id, Id, Value, Encoded, readonly []>;
}

/** Author-facing schema value carrying decoded and encoded types. */
export interface Schema<out Value, out Encoded = Value, out Id extends SchemaId = SchemaId>
  extends Port<Value, Encoded> {
  readonly [SchemaDetailsSlot]: SchemaDetails<Id, Value, Encoded>;
}

/**
 * Author-facing named-reference node.
 *
 * Direct field navigation deliberately stops here. Authors cross the reference
 * explicitly by composing this field reference with a field rooted in the
 * target schema, keeping recursive graphs finite and visible.
 */
export interface ReferenceSchema<out Value, out Encoded = Value, out Id extends SchemaId = SchemaId>
  extends Schema<Value, Encoded, Id> {
  readonly reference: SchemaReference<Id, Value, Encoded>;
}

/** Any author-facing schema value. */
export type AnySchema = Schema<unknown, unknown, SchemaId>;

/** Recover a schema's stable definition identity. */
export type SchemaIdOf<Value extends AnySchema> = Value extends Schema<unknown, unknown, infer Id> ? Id : never;

/** Author-facing field declaration with required/optional ownership explicit. */
export interface SchemaFieldSpec<
  Value extends AnySchema = AnySchema,
  Required extends boolean = boolean,
> {
  readonly schema: Value;
  readonly required: Required;
  readonly default?: CanonicalValue;
  readonly metadata?: SchemaMetadata;
}

/** Closed author-facing object field map. */
export type SchemaFieldMap = Readonly<Record<string, SchemaFieldSpec>>;

type RequiredFieldKeys<Fields extends SchemaFieldMap> = {
  readonly [Key in keyof Fields]-?: Fields[Key]['required'] extends true ? Key : never;
}[keyof Fields];

type OptionalFieldKeys<Fields extends SchemaFieldMap> = Exclude<keyof Fields, RequiredFieldKeys<Fields>>;

/** Decoded object shape derived from a field map. */
export type DecodedObject<Fields extends SchemaFieldMap> = Readonly<
  { [Key in RequiredFieldKeys<Fields>]: TypeOf<Fields[Key]['schema']> } &
    { [Key in OptionalFieldKeys<Fields>]?: TypeOf<Fields[Key]['schema']> }
>;

/** Encoded object shape derived from a field map. */
export type EncodedObject<Fields extends SchemaFieldMap> = Readonly<
  { [Key in RequiredFieldKeys<Fields>]: EncodedOf<Fields[Key]['schema']> } &
    { [Key in OptionalFieldKeys<Fields>]?: EncodedOf<Fields[Key]['schema']> }
>;

type FieldSchema<Value extends SchemaFieldSpec> = Value['schema'];

type SchemaCore<Value extends AnySchema> = Pick<
  Value,
  keyof Schema<TypeOf<Value>, EncodedOf<Value>, SchemaIdOf<Value>>
>;

type FieldNavigationReservedKey =
  | keyof Schema<unknown, unknown, SchemaId>
  | keyof FieldReference
  | 'fields'
  | 'element'
  | 'elements';

type DirectFieldTree<
  Root extends SchemaId,
  Fields extends SchemaFieldMap,
  Prefix extends DataPath,
> = Omit<FieldTree<Root, Fields, Prefix>, FieldNavigationReservedKey>;

type FieldNode<
  Root extends SchemaId,
  Value extends AnySchema,
  Segments extends DataPath,
> = SchemaCore<Value> &
  FieldReference<Root, SchemaIdOf<Value>, TypeOf<Value>, EncodedOf<Value>, Segments> &
  (Value extends ReferenceSchema<infer ReferencedValue, infer ReferencedEncoded, infer ReferencedId>
    ? { readonly reference: SchemaReference<ReferencedId, ReferencedValue, ReferencedEncoded> }
    : Value extends ObjectSchema<SchemaId, infer Nested>
      ? DirectFieldTree<Root, Nested, Segments> & { readonly fields: FieldTree<Root, Nested, Segments> }
      : Value extends ArraySchema<SchemaId, infer Element>
        ? { readonly element: FieldNode<Root, Element, readonly [...Segments, number]> }
        : Value extends TupleSchema<SchemaId, infer Elements>
          ? {
              readonly elements: {
                readonly [Index in keyof Elements]: Elements[Index] extends AnySchema
                  ? FieldNode<Root, Elements[Index], readonly [...Segments, Index & number]>
                  : never;
              };
            }
          : {});

/**
 * Navigable field tree derived once from a finite object schema. Every member is
 * both the target schema view and the path from the original root schema.
 */
export type FieldTree<
  Root extends SchemaId,
  Fields extends SchemaFieldMap,
  Prefix extends DataPath = readonly [],
> = {
  readonly [Key in keyof Fields & string]: FieldNode<
    Root,
    FieldSchema<Fields[Key]>,
    readonly [...Prefix, Key]
  >;
};

/** Object schema whose fields are typed, addressable navigation values. */
export type ObjectSchema<
  Id extends SchemaId,
  Fields extends SchemaFieldMap,
> = Schema<DecodedObject<Fields>, EncodedObject<Fields>, Id> &
  DirectFieldTree<Id, Fields, readonly []> & {
    /** Complete collision-safe navigation view, including reserved field names. */
    readonly fields: FieldTree<Id, Fields>;
  };

/** Array schema exposing its element as a typed schema-derived path. */
export type ArraySchema<
  Id extends SchemaId,
  Element extends AnySchema,
> = Schema<readonly TypeOf<Element>[], readonly EncodedOf<Element>[], Id> & {
  readonly element: FieldNode<Id, Element, readonly [number]>;
};

/** Tuple schema exposing each position as a typed schema-derived path. */
export type TupleSchema<
  Id extends SchemaId,
  Elements extends readonly AnySchema[],
> = Schema<
  { readonly [Index in keyof Elements]: TypeOf<Elements[Index]> },
  { readonly [Index in keyof Elements]: EncodedOf<Elements[Index]> },
  Id
> & {
  readonly elements: {
    readonly [Index in keyof Elements]: Elements[Index] extends AnySchema
      ? FieldNode<Id, Elements[Index], readonly [Index & number]>
      : never;
  };
};

/** Structured decode issue. */
export type DecodeIssue = Issue<
  | 'schema/type'
  | 'schema/missing'
  | 'schema/unknown-field'
  | 'schema/constraint'
  | 'schema/union'
  | 'schema/reference'
  | 'schema/transform'
  | 'schema/budget',
  { readonly message: string; readonly expected?: string; readonly received?: string }
>;

/** Strict external-input decode result. */
export type DecodeResult<Value> = Result<Value, readonly DecodeIssue[]>;

/** Schema-derived projection families. */
export type SchemaProjectionTarget =
  | 'json-schema'
  | 'standard-schema'
  | 'form'
  | 'operation'
  | 'documentation'
  | 'arbitrary'
  | 'storage-layout'
  | 'rust-layout';

/** Projection support is explicit and cannot silently widen semantics. */
export type SchemaProjectionSupport<Output = unknown> = Algebra<{
  supported: { readonly output: Output };
  unsupported: { readonly diagnostics: readonly Diagnostic[] };
}>;

/** Private runtime provenance may bind an admitted payload to the exact schema. */
export interface AdmissionClaim<Value, Id extends SchemaId = SchemaId, Encoded = Value> {
  readonly schema: SchemaReference<Id, Value, Encoded>;
  readonly address?: ContentAddress;
  readonly value: Value;
}

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

/** Type summary consumed by the root core topology. */
export interface SchemaTypeSurface {
  readonly schema: Schema<unknown, unknown>;
  readonly object: ObjectSchema<SchemaId, SchemaFieldMap>;
  readonly reference: ReferenceSchema<unknown, unknown>;
  readonly field: FieldReference;
  readonly entityField: EntityFieldReference;
  readonly composedField: ComposeFieldReferences<FieldReference, FieldReference>;
  readonly fieldPath: FieldPath;
  readonly node: SchemaNode;
  readonly document: SchemaDocument;
  readonly decodeIssue: DecodeIssue;
  readonly projection: SchemaProjectionSupport;
  readonly admission: AdmissionClaim<unknown>;
}
