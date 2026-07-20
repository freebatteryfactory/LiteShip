/**
 * The schema kernel AST — a frozen, plain-data discriminated union over a
 * CLOSED node vocabulary, plus the branded {@link Schema} value that carries it.
 *
 * Two layers, deliberately separated:
 * - {@link SchemaNode}: the runtime AST. Type-erased plain data, every node
 *   `Object.freeze`d at construction, discriminated by a literal `kind`. The
 *   decoder, the JSON-Schema deriver, and the arbitrary walker all read THIS.
 * - {@link Schema}`<A, I>`: the branded value handed to authors. It carries the
 *   root node plus PHANTOM `Type`/`Encoded` members that exist only at the type
 *   level. Those two members are exactly the
 *   `SchemaPort<A, I> = { readonly Type: A; readonly Encoded: I }` contract, so
 *   a kernel schema is structurally a SchemaPort — and so is every effect
 *   Schema — WITHOUT this module importing the port (coordinated by SHAPE).
 *
 * A schema value is branded through a module-private `WeakSet`, so {@link isSchema}
 * recognises kernel schemas by identity, never by a spoofable field.
 *
 * @module
 */

/**
 * The primitive values a {@link LiteralNode} may pin — the JSON primitive kinds
 * a literal and its JSON-Schema `const`/`enum` image both model.
 */
export type LiteralValue = string | number | boolean | null;

/**
 * A carrier constructor a {@link BytesNode} accepts (`Uint8Array`, `ArrayBuffer`,
 * …). `bytes` is a DECLARATION node: its valid domain is "an instance of this
 * carrier", opaque to structural derivation.
 */
export type BytesCtor = abstract new (...args: never[]) => object;

/**
 * The instance type a {@link BytesCtor} produces — `CarrierInstance<typeof Uint8Array>`
 * is `Uint8Array`. Avoids `InstanceType`'s `any`-typed constraint (banned here).
 */
export type CarrierInstance<C> = C extends abstract new (...args: never[]) => infer R ? R : never;

/** Author-supplied side-channel annotations keyed by symbol (e.g. an arbitrary thunk). */
export type SchemaAnnotations = Readonly<Record<symbol, unknown>>;

/**
 * Annotation key for an author-supplied `fast-check` arbitrary THUNK. A schema
 * whose valid domain is a generated SUBSET of an opaque carrier (canonical CBOR
 * bytes ⊂ `Uint8Array`) cannot be sampled structurally; the author attaches a
 * generator here and the harness walker honours it ahead of structural
 * derivation. The annotated value is a thunk so the arbitrary is built lazily.
 */
export const ArbitraryAnnotationId: unique symbol = Symbol.for('@liteship/core/schema/arbitrary');

/** The runtime brand marking a schema as a struct-field optional (see `schema.optional`). */
export const OptionalId: unique symbol = Symbol('@liteship/core/schema/optional');

// ---------------------------------------------------------------------------
// The node vocabulary — CLOSED. Adding a producer without a matching decode /
// derive / infer arm is a compile error at every consumer, by design.
// ---------------------------------------------------------------------------

/** Shared across every node: an optional symbol-keyed annotation bag. */
interface NodeMeta {
  readonly annotations?: SchemaAnnotations;
}

/** `string` — any `typeof 'string'` value. */
export interface StringNode extends NodeMeta {
  readonly kind: 'string';
}

/** `number` — any `typeof 'number'` value (NaN/Infinity included; refine via a brand). */
export interface NumberNode extends NodeMeta {
  readonly kind: 'number';
}

/** `boolean` — any `typeof 'boolean'` value. */
export interface BooleanNode extends NodeMeta {
  readonly kind: 'boolean';
}

/** A singleton literal pinned to one JSON primitive. */
export interface LiteralNode extends NodeMeta {
  readonly kind: 'literal';
  readonly value: LiteralValue;
}

/** A closed set of alternatives; decode accepts the first member that matches. */
export interface UnionNode extends NodeMeta {
  readonly kind: 'union';
  readonly members: readonly SchemaNode[];
}

/** One field of a {@link StructNode}: its key, child node, and presence law. */
export interface StructField {
  readonly key: string;
  readonly node: SchemaNode;
  readonly optional: boolean;
}

/** An object with a fixed, ordered set of keyed fields (each required or optional). */
export interface StructNode extends NodeMeta {
  readonly kind: 'struct';
  readonly fields: readonly StructField[];
}

/** A homogeneous array of `element`. */
export interface ArrayNode extends NodeMeta {
  readonly kind: 'array';
  readonly element: SchemaNode;
}

/**
 * A FIXED-ARITY tuple: a positional list whose length and per-position element
 * schemas are both pinned. Unlike {@link ArrayNode} (a homogeneous, variable-length
 * array), a tuple's arity is part of its type — decode enforces the exact element
 * count and decodes each position against its own element schema.
 */
export interface TupleNode extends NodeMeta {
  readonly kind: 'tuple';
  readonly elements: readonly SchemaNode[];
}

/** A string-keyed record whose values conform to `value`. */
export interface RecordNode extends NodeMeta {
  readonly kind: 'record';
  readonly value: SchemaNode;
}

/** `unknown` — accepts any value; no constraint. */
export interface UnknownNode extends NodeMeta {
  readonly kind: 'unknown';
}

/**
 * `any` — accepts any value; the runtime twin of {@link UnknownNode}, kept as a
 * distinct kind so derivers can tell an authored `any` from an `unknown`. Its
 * inferred TYPE is `unknown`: this repo bans an explicit `any`, and `unknown` is
 * the sound supertype, so nothing is lost at a decode boundary.
 */
export interface AnyNode extends NodeMeta {
  readonly kind: 'any';
}

/**
 * A DECLARATION node for an opaque binary carrier — valid iff the value is an
 * instance of `ctor`. Not structurally derivable; a `withArbitrary` thunk is the
 * sanctioned way to sample it.
 */
export interface BytesNode extends NodeMeta {
  readonly kind: 'bytes';
  readonly ctor: BytesCtor;
  readonly name: string;
}

/**
 * A nominal refinement: decode the `base`, then run `refine` (a parse-don't-
 * validate smart constructor). A thrown `ValidationError` folds into a
 * `schema/brand` decode issue; a returned value is the branded output.
 */
export interface BrandNode extends NodeMeta {
  readonly kind: 'brand';
  readonly base: SchemaNode;
  readonly name: string;
  readonly refine: (value: unknown) => unknown;
}

/**
 * A typed HOLE — a loud, enumerable, decode-blocking placeholder. It types as
 * its declared `A` so authoring proceeds, but decode ALWAYS emits a blocking
 * `schema/hole` issue and never passes data through.
 */
export interface HoleNode extends NodeMeta {
  readonly kind: 'hole';
  readonly name: string;
}

/** The closed discriminated union of every schema AST node. */
export type SchemaNode =
  | StringNode
  | NumberNode
  | BooleanNode
  | LiteralNode
  | UnionNode
  | StructNode
  | ArrayNode
  | TupleNode
  | RecordNode
  | UnknownNode
  | AnyNode
  | BytesNode
  | BrandNode
  | HoleNode;

// ---------------------------------------------------------------------------
// The branded schema value.
// ---------------------------------------------------------------------------

/**
 * A kernel schema value over decoded type `A` and encoded type `I`.
 *
 * `Type`/`Encoded` are PHANTOM: no runtime slot carries them (the wrapper holds
 * only `ast`). They exist so the value is structurally a
 * `SchemaPort<A, I> = { readonly Type: A; readonly Encoded: I }` — the same
 * phantom pair effect Schema carries — letting `Infer` read `A` off any
 * port-shaped value.
 */
export interface Schema<out A, out I = A> {
  readonly ast: SchemaNode;
  readonly Type: A;
  readonly Encoded: I;
}

/** A struct-field schema marked optional by `schema.optional`; carries the {@link OptionalId} brand. */
export type OptionalSchema<A, I> = Schema<A, I> & { readonly [OptionalId]: true };

/** True iff `S` is an `OptionalSchema` — the presence law `schema.struct` reads per field. */
export type IsOptional<S> = S extends { readonly [OptionalId]: true } ? true : false;

// ---------------------------------------------------------------------------
// Branding + factory.
// ---------------------------------------------------------------------------

const schemaRegistry = new WeakSet<object>();

/**
 * Wrap a frozen {@link SchemaNode} as a branded {@link Schema}`<A, I>`. `optional`
 * stamps the {@link OptionalId} brand for struct-field use. The `Type`/`Encoded`
 * projection is a phantom-only view — no runtime member is fabricated.
 */
export function makeSchema<A, I>(ast: SchemaNode, optional = false): Schema<A, I> {
  const wrapper: { readonly ast: SchemaNode } = { ast };
  if (optional) {
    Object.defineProperty(wrapper, OptionalId, {
      value: true,
      enumerable: false,
      writable: false,
      configurable: false,
    });
  }
  Object.freeze(wrapper);
  schemaRegistry.add(wrapper);
  return wrapper as Schema<A, I>;
}

/**
 * Identity guard: is `u` a schema value minted by this kernel? Keyed on the
 * private `WeakSet` brand, so a look-alike record with a matching shape does NOT
 * pass — the brand cannot be forged.
 */
export function isSchema(u: unknown): u is Schema<unknown, unknown> {
  return typeof u === 'object' && u !== null && schemaRegistry.has(u);
}

/**
 * Read the {@link ArbitraryAnnotationId} thunk off a node, or `undefined` when
 * absent. The thunk takes `fast-check` (supplied by the harness realizing it) so
 * the kernel never imports the property-testing engine.
 */
export function annotatedArbitrary(node: SchemaNode): ((fc: unknown) => unknown) | undefined {
  const annotations = node.annotations;
  if (annotations === undefined) return undefined;
  const thunk = annotations[ArbitraryAnnotationId];
  return typeof thunk === 'function' ? (thunk as (fc: unknown) => unknown) : undefined;
}
