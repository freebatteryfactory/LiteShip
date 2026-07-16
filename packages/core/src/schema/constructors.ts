/**
 * `S.*` — the smart constructors over the kernel AST.
 *
 * Each constructor validates its SHAPE eagerly (parse-don't-validate for schema
 * authors: a malformed schema throws a tagged `ValidationError` at build time,
 * never a silent broken node) and returns a frozen, branded {@link Schema} whose
 * phantom `Type`/`Encoded` are stamped by the signature. The vocabulary is the
 * closed set the AST models — no escape hatch, no open extension point.
 *
 * @module
 */

import { ValidationError } from '@czap/error';
import { ArbitraryAnnotationId, isSchema, makeSchema, OptionalId } from './ast.js';
import type {
  ArrayNode,
  BrandNode,
  BytesCtor,
  BytesNode,
  CarrierInstance,
  HoleNode,
  LiteralValue,
  OptionalSchema,
  RecordNode,
  Schema,
  SchemaAnnotations,
  SchemaNode,
  StructField,
  StructNode,
  UnionNode,
} from './ast.js';
import type { Infer, InferEncoded, SchemaFields, StructType, StructEncoded } from './infer.js';

const stringSchema = makeSchema<string, string>(Object.freeze({ kind: 'string' }));
const numberSchema = makeSchema<number, number>(Object.freeze({ kind: 'number' }));
const booleanSchema = makeSchema<boolean, boolean>(Object.freeze({ kind: 'boolean' }));
const unknownSchema = makeSchema<unknown, unknown>(Object.freeze({ kind: 'unknown' }));
// `any` decodes identically to `unknown`; the distinct node lets derivers tell
// the two apart, while the inferred type stays the sound `unknown` (no explicit
// `any` in this repo).
const anySchema = makeSchema<unknown, unknown>(Object.freeze({ kind: 'any' }));

/** A single-value literal pinned to one JSON primitive. */
function literal<const V extends LiteralValue>(value: V): Schema<V, V> {
  if (!(typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null)) {
    throw ValidationError('S.literal', 'a literal must be a string, number, boolean, or null');
  }
  return makeSchema<V, V>(Object.freeze({ kind: 'literal', value }));
}

/** A closed alternation; decode accepts the first member that matches. */
function union<const M extends readonly Schema<unknown, unknown>[]>(
  ...members: M
): Schema<Infer<M[number]>, InferEncoded<M[number]>> {
  if (members.length === 0) throw ValidationError('S.union', 'a union needs at least one member');
  for (const member of members) {
    if (!isSchema(member)) throw ValidationError('S.union', 'every union member must be a kernel schema');
  }
  const node: UnionNode = { kind: 'union', members: Object.freeze(members.map((member) => member.ast)) };
  return makeSchema<Infer<M[number]>, InferEncoded<M[number]>>(Object.freeze(node));
}

/** A fixed-key object; a field wrapped by {@link optional} becomes an optional key. */
function struct<const F extends SchemaFields>(fields: F): Schema<StructType<F>, StructEncoded<F>> {
  if (typeof fields !== 'object' || fields === null) {
    throw ValidationError('S.struct', 'fields must be an object of schemas');
  }
  const entries: StructField[] = [];
  for (const key of Object.keys(fields)) {
    if (key === '__proto__') {
      throw ValidationError('S.struct', 'a struct field cannot be named "__proto__"');
    }
    const child = fields[key];
    if (!isSchema(child)) {
      throw ValidationError('S.struct', `field "${key}" must be a kernel schema`);
    }
    entries.push(Object.freeze({ key, node: child.ast, optional: Object.hasOwn(child, OptionalId) }));
  }
  const node: StructNode = { kind: 'struct', fields: Object.freeze(entries) };
  return makeSchema<StructType<F>, StructEncoded<F>>(Object.freeze(node));
}

/** A homogeneous array of `element`. */
function array<const E extends Schema<unknown, unknown>>(
  element: E,
): Schema<readonly Infer<E>[], readonly InferEncoded<E>[]> {
  if (!isSchema(element)) throw ValidationError('S.array', 'the element must be a kernel schema');
  const node: ArrayNode = { kind: 'array', element: element.ast };
  return makeSchema<readonly Infer<E>[], readonly InferEncoded<E>[]>(Object.freeze(node));
}

/** A string-keyed record whose values conform to `value`. */
function record<const V extends Schema<unknown, unknown>>(
  value: V,
): Schema<{ readonly [k: string]: Infer<V> }, { readonly [k: string]: InferEncoded<V> }> {
  if (!isSchema(value)) throw ValidationError('S.record', 'the value schema must be a kernel schema');
  const node: RecordNode = { kind: 'record', value: value.ast };
  return makeSchema<{ readonly [k: string]: Infer<V> }, { readonly [k: string]: InferEncoded<V> }>(Object.freeze(node));
}

/**
 * A DECLARATION over an opaque binary carrier (`Uint8Array`, `ArrayBuffer`).
 * Decode accepts an instance; structural derivation refuses it (attach a
 * {@link withArbitrary} thunk to sample a narrow valid subset).
 */
function bytes<const C extends BytesCtor>(ctor: C, name?: string): Schema<CarrierInstance<C>, CarrierInstance<C>> {
  if (typeof ctor !== 'function') throw ValidationError('S.bytes', 'the carrier must be a constructor');
  const node: BytesNode = { kind: 'bytes', ctor, name: name ?? ctor.name };
  return makeSchema<CarrierInstance<C>, CarrierInstance<C>>(Object.freeze(node));
}

/**
 * A nominal refinement over `base`: decode the base, then run `refine` (an
 * existing parse-don't-validate smart constructor from `brands.ts` and friends).
 * The refined return type carries the brand, so `Infer` propagates nominality.
 */
function brand<B extends Schema<unknown, unknown>, Out>(
  base: B,
  refine: (value: Infer<B>) => Out,
  name?: string,
): Schema<Out, InferEncoded<B>> {
  if (!isSchema(base)) throw ValidationError('S.brand', 'the base must be a kernel schema');
  if (typeof refine !== 'function') throw ValidationError('S.brand', 'refine must be a smart-constructor function');
  const node: BrandNode = {
    kind: 'brand',
    base: base.ast,
    name: name ?? 'brand',
    refine: refine as (value: unknown) => unknown,
  };
  return makeSchema<Out, InferEncoded<B>>(Object.freeze(node));
}

/**
 * A typed HOLE: types as `A` so authoring proceeds, but decode always emits a
 * blocking `schema/hole` issue and never passes data. Loud, enumerable, and
 * decode-blocking — the sanctioned placeholder, never a silent typed hole.
 */
function hole<A = unknown>(name: string): Schema<A, A> {
  if (typeof name !== 'string' || name.length === 0) {
    throw ValidationError('S.hole', 'a hole needs a non-empty name');
  }
  const node: HoleNode = { kind: 'hole', name };
  return makeSchema<A, A>(Object.freeze(node));
}

/** Mark a schema as an OPTIONAL struct field (a no-op outside `S.struct`). */
function optional<S2 extends Schema<unknown, unknown>>(schema: S2): OptionalSchema<Infer<S2>, InferEncoded<S2>> {
  if (!isSchema(schema)) throw ValidationError('S.optional', 'optional wraps a kernel schema');
  return makeSchema<Infer<S2>, InferEncoded<S2>>(schema.ast, true) as OptionalSchema<Infer<S2>, InferEncoded<S2>>;
}

/**
 * Attach an author-supplied `fast-check` arbitrary THUNK to a schema (for the
 * harness walker). Returns a fresh schema with the same decode/encode behaviour
 * — only its sampling changes. Use it to sample a narrow valid domain a
 * structural walk cannot reach (e.g. canonical CBOR bytes ⊂ `Uint8Array`).
 */
export function withArbitrary<S2 extends Schema<unknown, unknown>>(schema: S2, arbitrary: () => unknown): S2 {
  if (!isSchema(schema)) throw ValidationError('S.withArbitrary', 'the first argument must be a kernel schema');
  if (typeof arbitrary !== 'function') throw ValidationError('S.withArbitrary', 'the arbitrary must be a thunk');
  const node = schema.ast;
  const annotations: SchemaAnnotations = Object.freeze({
    ...(node.annotations ?? {}),
    [ArbitraryAnnotationId]: arbitrary,
  });
  const nextNode = Object.freeze({ ...node, annotations }) as SchemaNode;
  return makeSchema(nextNode, Object.hasOwn(schema, OptionalId)) as S2;
}

/**
 * The schema-kernel constructor namespace. Scalars are singleton VALUES
 * (`S.string`); composites are constructor FUNCTIONS (`S.struct({ … })`).
 */
export const S = {
  string: stringSchema,
  number: numberSchema,
  boolean: booleanSchema,
  unknown: unknownSchema,
  any: anySchema,
  literal,
  union,
  struct,
  array,
  record,
  bytes,
  brand,
  hole,
  optional,
} as const;
