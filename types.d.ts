/**
 * LiteShip root type ABI.
 *
 * This external module is the declaration-only shape calculus shared by the
 * repository. It exports no runtime values, performs no registration, and
 * introduces no ambient globals. The numbered semantic waterfall begins at
 * `00_core/`; each later rung composes these operators with only the meaning it
 * uniquely owns.
 *
 * The file is intentionally broad. Runtime implementation files remain small
 * and scoped. This module gives humans, TypeScript, assurance, and coding agents
 * one place to inspect the global composition vocabulary.
 *
 * @module
 */

// Private phantom slots. They establish type identity without becoming public
// runtime values or implying forge-resistant runtime provenance.
declare const BrandSlot: unique symbol;
declare const HoleContractSlot: unique symbol;
declare const SignatureInputSlot: unique symbol;
declare const SignatureOutputSlot: unique symbol;
declare const SignatureFailureSlot: unique symbol;
declare const SignatureRequirementsSlot: unique symbol;

// ---------------------------------------------------------------------------
// 1. Small type-level operators
// ---------------------------------------------------------------------------

/** Flatten an intersection into the object shape shown by editors and errors. */
export type Simplify<Value> = { [Key in keyof Value]: Value[Key] } & {};

/** A value that may be available synchronously or through a promise-like value. */
export type MaybePromise<Value> = Value | PromiseLike<Value>;

/** Remove a selected key set from an object shape. */
export type WithoutKeys<Value extends object, Keys extends PropertyKey> = Omit<Value, Extract<keyof Value, Keys>>;

/** A readonly tuple with at least one member. */
export type NonEmptyTuple<Value> = readonly [Value, ...Value[]];

/** Preserve a readonly tuple as a named composition unit. */
export type Tuple<Values extends readonly unknown[]> = Readonly<Values>;

/** The union of every member in a readonly tuple or array. */
export type MemberOf<Values extends readonly unknown[]> = Values[number];

/** Concatenate two readonly tuples without widening their literal positions. */
export type Concat<Left extends readonly unknown[], Right extends readonly unknown[]> = readonly [...Left, ...Right];

/** Convert a union into the corresponding intersection. */
export type UnionToIntersection<Value> = (
  Value extends unknown ? (value: Value) => void : never
) extends (value: infer Intersection) => void
  ? Intersection
  : never;

/** Compile-time equality over mutual assignability. */
export type Equal<Left, Right> = (<Value>() => Value extends Left ? 1 : 2) extends <Value>() =>
  Value extends Right ? 1 : 2
  ? (<Value>() => Value extends Right ? 1 : 2) extends <Value>() => Value extends Left ? 1 : 2
    ? true
    : false
  : false;

/**
 * Compile-time assertion used by type proofs.
 *
 * The constraint rejects `false`, `boolean`, and `unknown` on its own. It does
 * **not** reject `never` or `any`: `never` is assignable to every constraint,
 * and `any` is assignable to `true`. So a law whose condition degenerates —
 * because a projector was handed a value outside its domain, or a `CaseOf`
 * named an arm that does not exist — passes silently.
 *
 * That hole cannot be closed inside this alias. A type alias evaluating to
 * `never` is a valid alias; the error only ever comes from the generic
 * constraint, so the degenerate value has to become literal `false` *before*
 * `Assert` receives it. A guard parameter with a dependent default does not
 * work either — TypeScript validates a default against its own constraint at
 * the declaration, where the conditional is still unresolved.
 *
 * The remedy is therefore at the call site, and it is {@link IsExactlyTrue}.
 * Use `Assert<IsExactlyTrue<Condition>>` wherever a condition could degenerate
 * — which is any law that reads through a projector, an indexed access, or a
 * `CaseOf`. The larger half of the remedy is upstream of that: the strict
 * projectors below now constrain their inputs, so the most common way to reach
 * `never` is a compile error at the point of misuse rather than a green law.
 */
export type Assert<Condition extends true> = Condition;

/** Whether `Value` is exactly `never`. */
export type IsNever<Value> = [Value] extends [never] ? true : false;

/**
 * Whether `Value` is `any`.
 *
 * `any` is assignable to and from everything, so it satisfies almost any
 * assertion written about it. The `0 extends 1 & Value` form is the standard
 * detection: the intersection collapses to `any` only for `any`, and `0`
 * extends `any`.
 */
export type IsAny<Value> = 0 extends 1 & Value ? true : false;

/**
 * Whether `Value` is the literal `true`, and nothing else.
 *
 * A recognizer, deliberately open over its input: its whole job is to answer
 * for values outside the domain it recognizes. It reports `false` for `never`,
 * `any`, `unknown`, `boolean`, and `false` — every form that would otherwise
 * satisfy or bypass {@link Assert}'s constraint — so a degenerate condition
 * arrives at `Assert` as literal `false` and fails to compile.
 */
export type IsExactlyTrue<Value> = IsAny<Value> extends true
  ? false
  : [Value] extends [never]
    ? false
    : [Value] extends [true]
      ? [true] extends [Value]
        ? true
        : false
      : false;

/** Keys whose properties are optional in an object shape. */
export type OptionalKeys<Value extends object> = {
  readonly [Key in keyof Value]-?: {} extends Pick<Value, Key> ? Key : never;
}[keyof Value];

/** Keys whose properties are required in an object shape. */
export type RequiredKeys<Value extends object> = Exclude<keyof Value, OptionalKeys<Value>>;

// ---------------------------------------------------------------------------
// 2. Products, coproducts, tags, algebras, and results
// ---------------------------------------------------------------------------

/** A product is a readonly record of simultaneously present fields. */
export type Product<Fields extends object> = Readonly<Fields>;

/** A coproduct is exactly one member of a closed readonly case tuple. */
export type Coproduct<Cases extends readonly object[]> = Cases[number];

/**
 * A tagged data case. Behavior is supplied by functions rather than inheritance.
 * A field product may not restate the reserved `_tag` discriminant.
 */
export type Tagged<Tag extends string, Fields extends object = {}> = '_tag' extends keyof Fields
  ? never
  : Simplify<Readonly<{ _tag: Tag }> & Readonly<Fields>>;

/** The literal discriminant carried by a tagged case or tagged algebra. */
export type TagOf<Value> = Value extends { readonly _tag: infer Tag extends string } ? Tag : never;

/** Select one case from a tagged algebra by its discriminant. */
export type CaseOf<Value, Tag extends TagOf<Value>> = Extract<Value, { readonly _tag: Tag }>;

/**
 * Build a closed tagged algebra from a map of discriminants to field products.
 * The map is the product vocabulary; the resulting union is the coproduct.
 */
export type Algebra<Definition extends Readonly<Record<string, object>>> = {
  readonly [Tag in keyof Definition & string]: Tagged<Tag, Definition[Tag]>;
}[keyof Definition & string];

/** Exhaustive handler table for one closed tagged algebra. */
export type Handlers<Value extends { readonly _tag: string }, Output> = {
  readonly [Tag in TagOf<Value>]: (value: CaseOf<Value, Tag>) => Output;
};

/** Partial handler table used with an explicit fallback. */
export type PartialHandlers<Value extends { readonly _tag: string }, Output> = Partial<Handlers<Value, Output>>;

/** Successful result arm. */
export interface Ok<out Value> {
  readonly ok: true;
  readonly value: Value;
}

/** Failed result arm. */
export interface Err<out Failure> {
  readonly ok: false;
  readonly error: Failure;
}

/** A value that is either successful or failed, with both payloads explicit. */
export type Result<Value, Failure> = Ok<Value> | Err<Failure>;

/** Extract the success payload from a result. */
export type OkOf<Value> = Value extends Ok<infer Success> ? Success : never;

/** Extract the failure payload from a result. */
export type ErrOf<Value> = Value extends Err<infer Failure> ? Failure : never;

// ---------------------------------------------------------------------------
// 3. Nominal refinements, addresses, and fingerprints
// ---------------------------------------------------------------------------

interface BrandWitness<Carrier, Identity> {
  readonly carrier: Carrier;
  readonly identity: Identity;
}

/**
 * Apply one nominal identity to an underlying carrier.
 *
 * Runtime validation, minting, canonicalization, and unforgeable provenance
 * remain with the semantic owner. The root brand is compile-time identity only.
 * Apply the root brand once per semantic value; when identity has several axes,
 * compose those axes inside `Identity` (usually a readonly tuple or product)
 * rather than stacking independent brands over the same carrier.
 */
export type Brand<Carrier, Identity> = Carrier & {
  readonly [BrandSlot]: BrandWitness<Carrier, Identity>;
};

/** Alias emphasizing a brand as a validated refinement of a carrier. */
export type Refined<Carrier, Identity> = Brand<Carrier, Identity>;

/**
 * Any root-branded value.
 *
 * `BrandWitness` holds both parameters in readonly properties, so it is
 * covariant and every concrete brand is assignable to this one. It exists to
 * give the two brand projectors a domain: recovering a carrier from something
 * that was never branded is meaningless, and should say so at the call rather
 * than resolve to `never` and feed a passing law.
 */
export type AnyBrand = Brand<unknown, unknown>;

/** Recover the underlying carrier from a root-branded value. */
export type BrandCarrier<Value extends AnyBrand> = Value extends {
  readonly [BrandSlot]: BrandWitness<infer Carrier, unknown>;
}
  ? Carrier
  : never;

/** Recover the nominal identity from a root-branded value. */
export type BrandIdentity<Value extends AnyBrand> = Value extends {
  readonly [BrandSlot]: BrandWitness<unknown, infer Identity>;
}
  ? Identity
  : never;

/**
 * Whether a type carries the root brand slot.
 *
 * A recognizer, and deliberately open over its input — asking "is this
 * branded?" about an unbranded value is the question, not a misuse. Contrast
 * {@link BrandCarrier}, which answers a question that only exists once the
 * answer here is yes.
 */
export type IsBranded<Value> = Value extends { readonly [BrandSlot]: BrandWitness<unknown, unknown> }
  ? true
  : false;

/** A nominal address whose kind is distinct from its carrier representation. */
export type Address<Kind extends PropertyKey, Carrier = string> = Brand<Carrier, readonly ['address', Kind]>;

/** A nominal digest labeled by its algorithm. */
export type Digest<Algorithm extends string, Carrier = `${Algorithm}:${string}`> = Brand<
  Carrier,
  readonly ['digest', Algorithm]
>;

/** A nominal fingerprint for one interpreted surface or context. */
export type Fingerprint<Kind extends PropertyKey, Carrier = string> = Brand<
  Carrier,
  readonly ['fingerprint', Kind]
>;

// ---------------------------------------------------------------------------
// 4. Representation ports and inference
// ---------------------------------------------------------------------------

/**
 * Structural relationship between an admitted type and its encoded/external form.
 *
 * `Type` and `Encoded` are phantom members. A core schema, a foreign schema, or
 * any other value carrying this relationship can satisfy the port by shape.
 */
export interface Port<out Type, out Encoded = Type> {
  readonly Type: Type;
  readonly Encoded: Encoded;
}

/** The admitted/decoded side of a port-shaped value. */
export type TypeOf<Value extends Port<unknown, unknown>> = Value extends { readonly Type: infer Type }
  ? Type
  : never;

/** The encoded/external side of a port-shaped value. */
export type EncodedOf<Value extends Port<unknown, unknown>> = Value extends { readonly Encoded: infer Encoded }
  ? Encoded
  : never;

/** A readonly tuple of port-shaped values. */
export type PortTuple = readonly Port<unknown, unknown>[];

/** Map a tuple of ports to the tuple of admitted types they carry. */
export type TypesOf<Ports extends PortTuple> = {
  readonly [Index in keyof Ports]: TypeOf<Ports[Index]>;
};

/** Map a tuple of ports to the tuple of encoded types they carry. */
export type EncodedTypesOf<Ports extends PortTuple> = {
  readonly [Index in keyof Ports]: EncodedOf<Ports[Index]>;
};

/**
 * Rebind a port's admitted and encoded relationship while preserving every
 * additional field owned by the concrete port value.
 *
 * Core uses this for genuine transforms whose admitted and encoded domains are
 * different relationships, not merely narrower versions of the existing domain.
 */
export type RebindPort<
  Value extends Port<unknown, unknown>,
  Type,
  Encoded = EncodedOf<Value>,
> = Simplify<WithoutKeys<Value, 'Type' | 'Encoded'> & Port<Type, Encoded>>;

/**
 * Narrow a port's admitted type while preserving its exact encoded form.
 * A non-narrowing replacement is rejected; use {@link RebindPort} when the
 * semantic owner is defining a true transform.
 */
export type RefinePort<
  Value extends Port<unknown, unknown>,
  Type extends TypeOf<Value>,
> = RebindPort<Value, Type, EncodedOf<Value>>;

// ---------------------------------------------------------------------------
// 5. Additive waterfall composition
// ---------------------------------------------------------------------------

/** Keys shared by two object shapes. */
export type SharedKeys<Left extends object, Right extends object> = Extract<keyof Left, keyof Right>;

/**
 * Add a local shape to an upstream shape without shadowing an upstream key.
 * A collision resolves to `never`, forcing deliberate specialization instead
 * of silently restating authority.
 */
export type Extend<Upstream extends object, Local extends object> = [SharedKeys<Upstream, Local>] extends [never]
  ? Simplify<Upstream & Local>
  : never;

/**
 * Keys that make a proposed refinement invalid: either the key is not owned by
 * the upstream shape, or its replacement is not assignable to the upstream
 * member it claims to narrow.
 */
export type InvalidRefinementKeys<Upstream extends object, Changes extends object> =
  | Exclude<keyof Changes, keyof Upstream>
  | {
      readonly [Key in keyof Changes & keyof Upstream]-?: Changes[Key] extends Upstream[Key]
        ? never
        : Key;
    }[keyof Changes & keyof Upstream];

/**
 * Deliberately narrow a subset of an existing shape.
 *
 * The result maps over the upstream shape, so required/optional and
 * readonly/mutable member modifiers remain owned by the upstream authority.
 * A widening, unrelated key, or attempted presence-law change resolves to
 * `never` instead of silently weakening the inherited contract.
 */
export type Refine<Upstream extends object, Changes extends object> = [
  InvalidRefinementKeys<Upstream, Changes>,
] extends [never]
  ? Simplify<{
      [Key in keyof Upstream]: Key extends keyof Changes ? Changes[Key] : Upstream[Key];
    }>
  : never;

/** A closed tuple of independently owned object layers. */
export type LayerRow = readonly [] | readonly [object, ...object[]];

type ComposeLayers<Layers extends LayerRow, Accumulator extends object> = Layers extends readonly [
  infer Head extends object,
  ...infer Tail extends LayerRow,
]
  ? [Extend<Accumulator, Head>] extends [never]
    ? never
    : ComposeLayers<Tail, Extend<Accumulator, Head> & object>
  : Simplify<Accumulator>;

/** Compose a layer tuple additively, rejecting every key collision. */
export type Compose<Layers extends LayerRow> = ComposeLayers<Layers, {}>;

// ---------------------------------------------------------------------------
// 6. Named typed holes and closed requirement rows
// ---------------------------------------------------------------------------

/**
 * A named typed hole that a later composition must fill.
 *
 * Runtime representations need only retain `name`; the private phantom slot
 * carries the required contract without introducing decorators, a global service
 * locator, or positional dependency resolution.
 */
export type Hole<Name extends string, Contract> = Readonly<{
  name: Name;
  [HoleContractSlot]: Contract;
}>;

/** Any typed hole. */
export type AnyHole = Hole<string, unknown>;

/** Read a hole's stable name. */
export type HoleKey<Value extends AnyHole> = Value extends Hole<infer Name, unknown> ? Name : never;

/** Read the contract a hole requires. */
export type HoleContract<Value extends AnyHole> = Value extends Hole<string, infer Contract> ? Contract : never;

/** A closed, ordered requirement tuple. Open arrays are intentionally excluded. */
export type RequirementRow = readonly [] | readonly [AnyHole, ...AnyHole[]];

/** The literal key union carried by a requirement tuple. */
export type RequirementKeys<Row extends RequirementRow> = HoleKey<Row[number]>;

type RequirementForKey<Row extends RequirementRow, Key extends PropertyKey> = Row[number] extends infer Value
  ? Value extends AnyHole
    ? HoleKey<Value> extends Key
      ? Value
      : never
    : never
  : never;

/** Select one requirement by its stable hole key. */
export type RequirementAt<
  Row extends RequirementRow,
  Key extends RequirementKeys<Row>,
> = RequirementForKey<Row, Key>;

type DuplicateRequirementKeysImpl<
  Row extends RequirementRow,
  Seen extends PropertyKey = never,
  Duplicates extends PropertyKey = never,
> = Row extends readonly [infer Head extends AnyHole, ...infer Tail extends RequirementRow]
  ? DuplicateRequirementKeysImpl<
      Tail,
      Seen | HoleKey<Head>,
      Duplicates | (HoleKey<Head> extends Seen ? HoleKey<Head> : never)
    >
  : Duplicates;

/** Every hole key repeated inside one requirement tuple. */
export type DuplicateRequirementKeys<Row extends RequirementRow> = DuplicateRequirementKeysImpl<Row>;

/** Preserve a requirement tuple only when every hole key is unique. */
export type UniqueRequirements<Row extends RequirementRow> = [DuplicateRequirementKeys<Row>] extends [never]
  ? Row
  : never;

/** Ergonomic name-indexed execution context derived from a closed requirement tuple. */
export type ContextOf<Row extends RequirementRow> = [UniqueRequirements<Row>] extends [never]
  ? never
  : Simplify<{
      readonly [Value in Row[number] as HoleKey<Value>]: HoleContract<Value>;
    }>;

/** Requirement keys missing entirely from a supplied context. */
export type MissingRequirementKeys<
  Row extends RequirementRow,
  Context extends object,
> = Exclude<RequirementKeys<Row>, keyof Context>;

type IncompatibleRequirementKey<
  Row extends RequirementRow,
  Context extends object,
  Key extends RequirementKeys<Row>,
> = Key extends keyof Context
  ? Context[Key] extends HoleContract<RequirementForKey<Row, Key>>
    ? never
    : Key
  : never;

/** Requirement keys present in a context but carrying an incompatible contract. */
export type IncompatibleRequirementKeys<
  Row extends RequirementRow,
  Context extends object,
> = {
  readonly [Key in RequirementKeys<Row>]: IncompatibleRequirementKey<Row, Context, Key>;
}[RequirementKeys<Row>];

/** Whether a context satisfies every unique requirement with a compatible value. */
export type RequirementsSatisfied<
  Row extends RequirementRow,
  Context extends object,
> = [UniqueRequirements<Row>] extends [never]
  ? false
  : [MissingRequirementKeys<Row, Context> | IncompatibleRequirementKeys<Row, Context>] extends [never]
    ? true
    : false;

/** Keep a context only when it satisfies the complete requirement tuple. */
export type SatisfiedContext<
  Row extends RequirementRow,
  Context extends object,
> = RequirementsSatisfied<Row, Context> extends true ? Context : never;

/** One typed hole paired with a value satisfying its declared contract. */
export interface Binding<Value extends AnyHole = AnyHole> {
  readonly hole: Value;
  readonly value: HoleContract<Value>;
}

/** Ordered bindings required to fill one unique closed requirement tuple. */
export type BindingsFor<Row extends RequirementRow> = [UniqueRequirements<Row>] extends [never]
  ? never
  : {
      readonly [Index in keyof Row]: Row[Index] extends AnyHole ? Binding<Row[Index]> : never;
    };

type BindingHole<Value> = Value extends Binding<infer Required> ? Required : never;

/** A closed, ordered tuple of hole/value bindings. */
export type BindingRow = readonly [] | readonly [Binding, ...Binding[]];

/** Recover the requirement tuple carried by a closed binding tuple. */
export type RequirementsFromBindings<Row extends BindingRow> = {
  readonly [Index in keyof Row]: Row[Index] extends Binding<infer Required> ? Required : never;
} extends infer Requirements extends RequirementRow
  ? Requirements
  : never;

/**
 * Name-indexed context derived from an ordered binding tuple.
 * Duplicate hole names collapse to `never` rather than overwriting one another.
 */
export type ContextFromBindings<Row extends BindingRow> = [
  UniqueRequirements<RequirementsFromBindings<Row>>,
] extends [never]
  ? never
  : Simplify<{
      readonly [Value in Row[number] as HoleKey<BindingHole<Value>>]: Value['value'];
    }>;

type MergeOneRequirement<
  Accumulator extends RequirementRow,
  Value extends AnyHole,
> = RequirementForKey<Accumulator, HoleKey<Value>> extends infer Existing
  ? [Existing] extends [never]
    ? readonly [...Accumulator, Value]
    : Existing extends AnyHole
      ? Equal<HoleContract<Existing>, HoleContract<Value>> extends true
        ? Accumulator
        : never
      : never
  : never;

type MergeRequirementRows<
  Accumulator extends RequirementRow,
  Remaining extends RequirementRow,
> = Remaining extends readonly [infer Head extends AnyHole, ...infer Tail extends RequirementRow]
  ? [MergeOneRequirement<Accumulator, Head>] extends [never]
    ? never
    : MergeOneRequirement<Accumulator, Head> extends infer Next extends RequirementRow
      ? MergeRequirementRows<Next, Tail>
      : never
  : Accumulator;

/**
 * Merge two unique requirement tuples.
 *
 * Existing identical holes are deduplicated, new holes append in declaration
 * order, and a same-name contract conflict collapses the composition to `never`.
 */
export type MergeRequirements<
  Left extends RequirementRow,
  Right extends RequirementRow,
> = [UniqueRequirements<Left>] extends [never]
  ? never
  : [UniqueRequirements<Right>] extends [never]
    ? never
    : MergeRequirementRows<Left, Right>;

// ---------------------------------------------------------------------------
// 7. Typed signatures and executable composition
// ---------------------------------------------------------------------------

/**
 * Type-only relationship between input, output, failure algebra, and requirements.
 *
 * Core specializes this into operations, queries, transforms, programs, and
 * other semantic contracts without the root ABI blessing those nouns early.
 */
export type Signature<
  Input,
  Output,
  Failure = never,
  Requirements extends RequirementRow = readonly [],
> = [UniqueRequirements<Requirements>] extends [never]
  ? never
  : Readonly<{
      [SignatureInputSlot]: (input: Input) => void;
      [SignatureOutputSlot]: Output;
      [SignatureFailureSlot]: Failure;
      [SignatureRequirementsSlot]: Requirements;
    }>;

/** Any typed signature. */
export type AnySignature = Signature<never, unknown, unknown, RequirementRow>;

/** Input carried by a signature. */
export type InputOf<Value extends AnySignature> = Value extends Signature<
  infer Input,
  infer _Output,
  infer _Failure,
  infer _Requirements
>
  ? Input
  : never;

/** Output carried by a signature. */
export type OutputOf<Value extends AnySignature> = Value extends Signature<
  infer _Input,
  infer Output,
  infer _Failure,
  infer _Requirements
>
  ? Output
  : never;

/** Failure algebra carried by a signature. */
export type FailureOf<Value extends AnySignature> = Value extends Signature<
  infer _Input,
  infer _Output,
  infer Failure,
  infer _Requirements
>
  ? Failure
  : never;

/** Requirement tuple carried by a signature. */
export type RequirementsOf<Value extends AnySignature> = Value extends Signature<
  infer _Input,
  infer _Output,
  infer _Failure,
  infer Requirements
>
  ? Requirements
  : never;

/** Whether the left output can be supplied as the right input. */
export type SignaturesConnect<Left extends AnySignature, Right extends AnySignature> = [OutputOf<Left>] extends [
  InputOf<Right>,
]
  ? true
  : false;

type ComposeConnectedSignatures<
  Left extends AnySignature,
  Right extends AnySignature,
  Requirements,
> = Requirements extends RequirementRow
  ? Signature<
      InputOf<Left>,
      OutputOf<Right>,
      FailureOf<Left> | FailureOf<Right>,
      Requirements
    >
  : never;

/**
 * Compose two signatures into a pipeline.
 *
 * Inputs enter through the left signature, outputs leave through the right,
 * failures form a coproduct, and named requirements merge without positional DI.
 */
export type ComposeSignatures<
  Left extends AnySignature,
  Right extends AnySignature,
> = SignaturesConnect<Left, Right> extends true
  ? ComposeConnectedSignatures<
      Left,
      Right,
      MergeRequirements<RequirementsOf<Left>, RequirementsOf<Right>>
    >
  : never;

/** Result shape produced by a signature. */
export type SignatureResult<Value extends AnySignature> = Result<OutputOf<Value>, FailureOf<Value>>;

/** Executable realization of a typed signature. */
export type Executor<Value extends AnySignature> = (
  input: InputOf<Value>,
  context: ContextOf<RequirementsOf<Value>>,
) => MaybePromise<SignatureResult<Value>>;

// ---------------------------------------------------------------------------
// 8. Generic identity, path, reference, causality, and envelope products
// ---------------------------------------------------------------------------

/** A shape with a stable human or machine name. */
export interface Named<out Name extends PropertyKey = string> {
  readonly name: Name;
}

/** A shape carrying one identity value. */
export interface Identified<out Identity = unknown> {
  readonly id: Identity;
}

/** A shape carrying one immutable address or interpreted fingerprint. */
export interface Addressed<out AddressValue = unknown> {
  readonly address: AddressValue;
}

/** A shape carrying one explicit representation version. */
export interface Versioned<out Version = number> {
  readonly version: Version;
}

/** A typed reference to an identified subject. */
export interface Reference<out Kind extends PropertyKey = string, out Identity = unknown> {
  readonly kind: Kind;
  readonly id: Identity;
}

/**
 * Ordered predecessor references for a causal value.
 * Empty means genesis, one member means a linear successor, and several members
 * mean an explicit merge. Core may refine this generic row for stricter domains.
 */
export type Predecessors<ReferenceValue> = readonly ReferenceValue[];

/** A shape linked causally to zero or more predecessor references. */
export interface Causal<out ReferenceValue = unknown> {
  readonly previous: Predecessors<ReferenceValue>;
}

/** A shape carrying provenance supplied by its semantic owner. */
export interface Provenanced<out Provenance = unknown> {
  readonly provenance: Provenance;
}

/** Reserved keys carried by every versioned envelope. */
type EnvelopeReservedKey = '_tag' | '_version';

/**
 * A closed versioned envelope around a readonly body.
 * The body may not shadow `_tag` or `_version`.
 */
export type Envelope<
  Tag extends string,
  Version extends string | number,
  Body extends object,
> = Extract<keyof Body, EnvelopeReservedKey> extends never
  ? Simplify<Readonly<{ _tag: Tag; _version: Version }> & Readonly<Body>>
  : never;

/** One path segment into data or an addressed projection. */
export type PathSegment = string | number;

/** A stable readonly path through structured data. */
export type DataPath = readonly PathSegment[];

/** Generic path-addressed issue data. Semantic error algebras remain downstream. */
export interface Issue<out Code extends string = string, out Detail = unknown> {
  readonly code: Code;
  readonly path: DataPath;
  readonly detail: Detail;
}

/** A stable key/value entry whose tuple order can participate in canonical data. */
export type Entry<Key extends PropertyKey, Value> = readonly [key: Key, value: Value];

/** Map named values into an ergonomic name-indexed object. */
export type IndexByName<Values extends readonly (Named<PropertyKey> & { readonly value: unknown })[]> = {
  readonly [Value in Values[number] as Value['name']]: Value['value'];
};

// ---------------------------------------------------------------------------
// 9. Content-addressed Type ABI model and evidence
// ---------------------------------------------------------------------------

/** Canonical Type ABI IR version owned by root and realized by system assurance. */
export type TypeAbiCanonicalizer = 'liteship.type-abi/v1';

/** Address of one canonical interpreted public type surface. */
export type TypeAbiAddress = Address<'liteship.type-abi', `sha256:${string}`>;

/** Digest of one canonical Type ABI surface before toolchain interpretation is bound. */
export type TypeAbiSurfaceDigest = Digest<'sha256'>;

/** Address of the TypeScript interpretation context used for an ABI surface. */
export type TypeScriptToolchainAddress = Address<'liteship.typescript-toolchain', `sha256:${string}`>;

/** Stable identity for one source home participating in the type waterfall. */
export type TypeAbiHome = Brand<string, 'LiteShipTypeAbiHome'>;

/** Canonical local identifier for a node in one Type ABI surface. */
export type TypeAbiNodeId = Brand<number, 'LiteShipTypeAbiNodeId'>;

/** Canonical local identifier for one generic/infer binder. */
export type TypeAbiBinderId = Brand<number, 'LiteShipTypeAbiBinderId'>;

/** Canonical identity for one declaration in a Type ABI surface closure. */
export type TypeAbiSymbolId = Brand<string, 'LiteShipTypeAbiSymbolId'>;

/** Roles assigned by the one root TypeScript toolchain policy. */
export type TypeScriptToolchainRole =
  | 'primary-check'
  | 'compatibility-check'
  | 'declaration-emit'
  | 'semantic-abi'
  | 'analysis-api'
  | 'embedded-language'
  | 'language-service';

/** Physical implementation family of one TypeScript compiler lane. */
export type TypeScriptCompilerImplementation = 'native' | 'javascript' | 'other';

/** Exact compiler implementation occupying one or more root-assigned roles. */
export interface TypeScriptCompilerFingerprint {
  readonly packageName: string;
  readonly version: string;
  readonly implementation: TypeScriptCompilerImplementation;
  readonly artifact: Digest<'sha256'>;
}

/** One standard-library declaration fingerprint in a toolchain attestation. */
export interface TypeScriptLibraryFingerprint {
  readonly name: string;
  readonly digest: Digest<'sha256'>;
}

/**
 * One exact TypeScript lane under the root toolchain authority.
 *
 * A fingerprint identifies interpretation inputs only. Role ownership lives once
 * in {@link TypeScriptToolchainMatrix}, so a lane does not independently claim
 * authority merely by carrying a role label.
 */
export interface TypeScriptToolchainFingerprint {
  readonly address: TypeScriptToolchainAddress;
  readonly compiler: TypeScriptCompilerFingerprint;
  readonly compilerOptions: Fingerprint<'typescript.compiler-options', `sha256:${string}`>;
  readonly libraries: readonly TypeScriptLibraryFingerprint[];
}

/**
 * Complete role-indexed TypeScript policy pinned by the repository root.
 * Every role has exactly one lane address; one lane may lawfully own several roles.
 */
export interface TypeScriptToolchainMatrix {
  readonly lanes: NonEmptyTuple<TypeScriptToolchainFingerprint>;
  readonly roles: Readonly<{
    [Role in TypeScriptToolchainRole]: TypeScriptToolchainAddress;
  }>;
}

/** One upstream type surface committed into a downstream layer surface. */
export interface TypeAbiDependency {
  readonly home: TypeAbiHome;
  readonly address: TypeAbiAddress;
}

/** Canonical literal values represented without host numeric/string ambiguity. */
export type TypeAbiLiteral = Algebra<{
  string: { readonly value: string };
  number: { readonly decimal: string };
  bigint: { readonly decimal: string };
  boolean: { readonly value: boolean };
  null: {};
}>;

/** Canonical property keys, including references to unique-symbol declarations. */
export type TypeAbiPropertyKey = Algebra<{
  string: { readonly value: string };
  number: { readonly decimal: string };
  uniqueSymbol: { readonly symbol: TypeAbiSymbolReference };
}>;

/** Reference to a declaration in this surface, an upstream ABI, or a library. */
export type TypeAbiSymbolReference = Algebra<{
  local: { readonly symbol: TypeAbiSymbolId };
  upstream: {
    readonly home: TypeAbiHome;
    readonly address: TypeAbiAddress;
    readonly symbol: string;
  };
  library: {
    readonly library: Digest<'sha256'>;
    readonly symbol: string;
  };
}>;

/** Effective variance of one canonical generic parameter. */
export type TypeAbiVariance = 'in' | 'out' | 'in-out' | 'independent' | 'unspecified';

/** One canonical generic or infer parameter declaration. */
export interface TypeAbiTypeParameter {
  readonly binder: TypeAbiBinderId;
  readonly index: number;
  readonly variance: TypeAbiVariance;
  readonly isConst: boolean;
  readonly constraint?: TypeAbiNodeId;
  readonly default?: TypeAbiNodeId;
}

/** One positional parameter in a canonical call/construct signature. */
export interface TypeAbiParameter {
  readonly type: TypeAbiNodeId;
  readonly optional: boolean;
  readonly rest: boolean;
}

/** Type predicate carried by a canonical signature. */
export type TypeAbiPredicate = Algebra<{
  is: {
    readonly parameter: number | 'this';
    readonly type: TypeAbiNodeId;
  };
  asserts: {
    readonly parameter: number | 'this';
  };
  assertsIs: {
    readonly parameter: number | 'this';
    readonly type: TypeAbiNodeId;
  };
}>;

/** Canonical call or construct signature. Overload order remains significant. */
export interface TypeAbiSignature {
  readonly binder?: TypeAbiBinderId;
  readonly typeParameters: readonly TypeAbiTypeParameter[];
  readonly thisType?: TypeAbiNodeId;
  readonly parameters: readonly TypeAbiParameter[];
  readonly returnType: TypeAbiNodeId;
  readonly predicate?: TypeAbiPredicate;
}

/** Visibility participating in structural and nominal class behavior. */
export type TypeAbiVisibility = 'public' | 'protected' | 'private';

/** One canonical member of an object, interface, or class instance type. */
export type TypeAbiMember = Algebra<{
  property: {
    readonly key: TypeAbiPropertyKey;
    readonly type: TypeAbiNodeId;
    readonly optional: boolean;
    readonly readonly: boolean;
    readonly visibility: TypeAbiVisibility;
    readonly declaredBy?: TypeAbiSymbolReference;
  };
  method: {
    readonly key: TypeAbiPropertyKey;
    readonly signatures: NonEmptyTuple<TypeAbiSignature>;
    readonly optional: boolean;
    readonly visibility: TypeAbiVisibility;
    readonly declaredBy?: TypeAbiSymbolReference;
  };
  accessor: {
    readonly key: TypeAbiPropertyKey;
    readonly getType?: TypeAbiNodeId;
    readonly setType?: TypeAbiNodeId;
    readonly visibility: TypeAbiVisibility;
    readonly declaredBy?: TypeAbiSymbolReference;
  };
}>;

/** One canonical index signature. */
export interface TypeAbiIndexSignature {
  readonly keyType: TypeAbiNodeId;
  readonly valueType: TypeAbiNodeId;
  readonly readonly: boolean;
}

/** One exact tuple position. Labels are source metadata, not ABI identity. */
export interface TypeAbiTupleElement {
  readonly type: TypeAbiNodeId;
  readonly optional: boolean;
  readonly rest: boolean;
}

/** Modifier behavior on a mapped-type property. */
export type TypeAbiMappedModifier = 'preserve' | 'add' | 'remove';

/** Primitive type names represented directly by canonical Type ABI v1. */
export type TypeAbiPrimitive =
  | 'any'
  | 'unknown'
  | 'never'
  | 'void'
  | 'undefined'
  | 'null'
  | 'boolean'
  | 'number'
  | 'bigint'
  | 'string'
  | 'symbol'
  | 'object'
  | 'non-nullish';

/** One span in a template-literal type. */
export interface TypeAbiTemplateSpan {
  readonly type: TypeAbiNodeId;
  readonly tail: string;
}

/**
 * Closed canonical vocabulary for a resolved TypeScript public type graph.
 *
 * Nodes reference one another by canonical local identifiers, so recursive types
 * remain finite. Source syntax that resolves to the same supported type graph
 * lowers to the same node vocabulary under the same toolchain fingerprint.
 */
export type TypeAbiNode = Algebra<{
  primitive: { readonly name: TypeAbiPrimitive };
  literal: { readonly value: TypeAbiLiteral };
  parameter: {
    readonly binder: TypeAbiBinderId;
    readonly index: number;
  };
  this: {};
  reference: {
    readonly target: TypeAbiSymbolReference;
    readonly arguments: readonly TypeAbiNodeId[];
  };
  union: { readonly members: NonEmptyTuple<TypeAbiNodeId> };
  intersection: { readonly members: NonEmptyTuple<TypeAbiNodeId> };
  array: {
    readonly element: TypeAbiNodeId;
    readonly readonly: boolean;
  };
  tuple: {
    readonly elements: readonly TypeAbiTupleElement[];
    readonly readonly: boolean;
  };
  object: {
    readonly members: readonly TypeAbiMember[];
    readonly calls: readonly TypeAbiSignature[];
    readonly constructs: readonly TypeAbiSignature[];
    readonly indexes: readonly TypeAbiIndexSignature[];
  };
  conditional: {
    readonly check: TypeAbiNodeId;
    readonly extends: TypeAbiNodeId;
    readonly whenTrue: TypeAbiNodeId;
    readonly whenFalse: TypeAbiNodeId;
    readonly distributive: boolean;
  };
  mapped: {
    readonly binder: TypeAbiBinderId;
    readonly parameter: TypeAbiTypeParameter;
    readonly source: TypeAbiNodeId;
    readonly nameType?: TypeAbiNodeId;
    readonly value: TypeAbiNodeId;
    readonly readonly: TypeAbiMappedModifier;
    readonly optional: TypeAbiMappedModifier;
  };
  indexedAccess: {
    readonly object: TypeAbiNodeId;
    readonly index: TypeAbiNodeId;
  };
  operator: {
    readonly operator: 'keyof' | 'readonly' | 'unique';
    readonly target: TypeAbiNodeId;
  };
  templateLiteral: {
    readonly head: string;
    readonly spans: readonly TypeAbiTemplateSpan[];
  };
  query: { readonly target: TypeAbiSymbolReference };
  infer: {
    readonly binder: TypeAbiBinderId;
    readonly index: number;
    readonly constraint?: TypeAbiNodeId;
  };
  intrinsic: { readonly name: string };
}>;

/** One canonically numbered type node. */
export interface TypeAbiNodeEntry {
  readonly id: TypeAbiNodeId;
  readonly node: TypeAbiNode;
}

/** Declaration kinds whose type side can participate in a public surface closure. */
export type TypeAbiDeclarationKind =
  | 'type-alias'
  | 'interface'
  | 'class'
  | 'enum'
  | 'namespace'
  | 'function'
  | 'variable'
  | 'unique-symbol';

/** Whether a declaration is public or a private support identity reachable from it. */
export type TypeAbiDeclarationExposure = 'public' | 'reachable-support';

/**
 * Which TypeScript symbol spaces one resolved declaration contributes to.
 * The tag prevents a value-only declaration from accidentally masquerading as
 * a type declaration and makes dual-space declarations explicit in the ABI IR.
 */
export type TypeAbiDeclarationMeaning = Algebra<{
  'type-only': {
    readonly type: TypeAbiNodeId;
  };
  'value-only': {
    readonly valueType: TypeAbiNodeId;
  };
  dual: {
    readonly type: TypeAbiNodeId;
    readonly valueType: TypeAbiNodeId;
  };
}>;

/** One resolved declaration, including any reachable value-side type projection. */
export type TypeAbiDeclaration = Simplify<
  {
    readonly symbol: TypeAbiSymbolId;
    readonly kinds: NonEmptyTuple<TypeAbiDeclarationKind>;
    readonly binder?: TypeAbiBinderId;
    readonly typeParameters: readonly TypeAbiTypeParameter[];
    readonly exposure: TypeAbiDeclarationExposure;
  } & TypeAbiDeclarationMeaning
>;

/** Whether a public export exposes type identity, value identity, or both. */
export type TypeAbiExportKind = 'type-only' | 'value-only' | 'dual';

/** One public export routed to its canonical declaration identity. */
export interface TypeAbiExport {
  readonly name: string;
  readonly kind: TypeAbiExportKind;
  readonly symbol: TypeAbiSymbolId;
}

/** One public form the canonicalizer observed but could not interpret soundly. */
export interface TypeAbiUnsupportedForm {
  readonly code: string;
  readonly declaration?: TypeAbiSymbolId;
  readonly path: DataPath;
}

/** Whether the complete observed public population was canonically interpreted. */
export type TypeAbiCoverage = Algebra<{
  complete: {};
  incomplete: { readonly unsupported: NonEmptyTuple<TypeAbiUnsupportedForm> };
}>;

/** Anti-vacuity population carried by a canonical surface. */
export interface TypeAbiPopulation {
  readonly sourceFiles: number;
  readonly publicExports: number;
  readonly declarations: number;
  readonly nodes: number;
  readonly upstreamDependencies: number;
}

/**
 * Canonical normalized public type graph for one source home.
 *
 * `declarations` includes private support declarations only when a public type
 * transitively requires their identity. Their canonical local IDs are independent
 * of source names, so a harmless private rename need not fork the public ABI.
 */
export type TypeAbiSurface = Envelope<
  'LiteShipTypeAbiSurface',
  1,
  {
    readonly canonicalizer: TypeAbiCanonicalizer;
    readonly home: TypeAbiHome;
    readonly entry: string;
    readonly upstream: readonly TypeAbiDependency[];
    readonly exports: readonly TypeAbiExport[];
    readonly declarations: readonly TypeAbiDeclaration[];
    readonly nodes: readonly TypeAbiNodeEntry[];
    readonly population: TypeAbiPopulation;
    readonly coverage: TypeAbiCoverage;
  }
>;

/** Reference to the canonical surface artifact named by an attestation. */
export type TypeAbiSurfaceReference = Reference<'type-abi-surface', TypeAbiSurfaceDigest>;

/**
 * Generated attestation naming one canonical surface under one exact toolchain.
 *
 * `address` is computed from canonicalizer + surface digest + interpreter
 * address, never from the attestation including its own address. The surface itself
 * commits to every upstream ABI address, so the result forms the type waterfall.
 */
export type TypeAbiAttestation = Envelope<
  'LiteShipTypeAbiAttestation',
  1,
  {
    readonly canonicalizer: TypeAbiCanonicalizer;
    readonly subject: TypeAbiSurfaceReference;
    readonly address: TypeAbiAddress;
    readonly interpreter: TypeScriptToolchainFingerprint;
    readonly sourceDigest?: Digest<'sha256'>;
  }
>;

// ---------------------------------------------------------------------------
// 10. Small compile-time surface proofs
// ---------------------------------------------------------------------------

/** Public type surface of a module expressed as an object map. */
export type TypeSurface = Readonly<Record<string, unknown>>;

/** Whether a downstream surface includes its complete upstream surface. */
export type ExtendsSurface<
  Downstream extends TypeSurface,
  Upstream extends TypeSurface,
> = Downstream extends Upstream ? true : false;

/** Whether two projected surfaces are mutually assignable. */
export type SurfaceEquivalent<
  Left extends TypeSurface,
  Right extends TypeSurface,
> = Equal<Left, Right>;
