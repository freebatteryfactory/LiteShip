/**
 * Type-level projection from a schema VALUE to the types it decodes and encodes.
 *
 * The kernel stamps a schema's decoded/encoded types onto its phantom
 * `Type`/`Encoded` members at every constructor, so extraction is structural:
 * {@link Infer} reads `Type`, {@link InferEncoded} reads `Encoded`. Because the
 * read is by SHAPE (`{ readonly Type }`), it works on any port-shaped value —
 * a kernel schema OR a foreign effect Schema — which is what `CapsuleContract`
 * relies on to derive In/Out from the schema it is handed.
 *
 * The one non-trivial map lives here: {@link StructType} remaps a struct's
 * optional fields to optional KEYS (`k?:`), the shape a decoded struct actually
 * takes. Brand nominality, the bytes carrier instance, and `hole<A> ⇒ A` are all
 * carried by the constructors' stamped `Type`, so they need no work here — they
 * fall out of the structural read.
 *
 * @module
 */

import type { IsOptional, OptionalSchema, Schema } from './ast.js';

/** Flatten an intersection into a single object type for readable inference. */
type Prettify<T> = { [K in keyof T]: T[K] } & {};

/**
 * The decoded type of a schema (or any `SchemaPort`-shaped value): its `Type`
 * phantom. Optional-key remapping, brand nominality (`ContentAddress`), the
 * bytes carrier instance, and `hole<A> ⇒ A` are all already stamped into that
 * member by the constructor, so this read surfaces them directly.
 */
export type Infer<S> = S extends { readonly Type: infer A } ? A : never;

/** The encoded (wire) type of a schema: its `Encoded` phantom. */
export type InferEncoded<S> = S extends { readonly Encoded: infer I } ? I : never;

/** A fields record as accepted by `schema.struct` — string keys to (optional-or-not) schemas. */
export type SchemaFields = Readonly<Record<string, Schema<unknown, unknown>>>;

/**
 * The decoded object type of `schema.struct(fields)`: required fields become required
 * keys, `OptionalSchema`-marked fields become OPTIONAL keys (`k?:`). Key
 * remapping via `as` drives the required/optional split off `IsOptional`.
 */
export type StructType<F extends SchemaFields> = Prettify<
  { readonly [K in keyof F as IsOptional<F[K]> extends true ? never : K]: Infer<F[K]> } & {
    readonly [K in keyof F as IsOptional<F[K]> extends true ? K : never]?: Infer<F[K]>;
  }
>;

/** The encoded object type of `schema.struct(fields)` — the {@link StructType} shape over `Encoded`. */
export type StructEncoded<F extends SchemaFields> = Prettify<
  { readonly [K in keyof F as IsOptional<F[K]> extends true ? never : K]: InferEncoded<F[K]> } & {
    readonly [K in keyof F as IsOptional<F[K]> extends true ? K : never]?: InferEncoded<F[K]>;
  }
>;

/**
 * The decoded type of `schema.tuple(...elements)`: a READONLY tuple that mirrors each
 * element position's `Infer`. The homomorphic mapped type over `keyof E` preserves
 * tuple-ness (arity and per-position types), so `schema.tuple(schema.number, schema.string)` infers
 * `readonly [number, string]`, not `readonly (number | string)[]`.
 */
export type TupleType<E extends readonly Schema<unknown, unknown>[]> = {
  readonly [K in keyof E]: Infer<E[K]>;
};

/** The encoded (wire) tuple type of `schema.tuple(...elements)` — the {@link TupleType} shape over `InferEncoded`. */
export type TupleEncoded<E extends readonly Schema<unknown, unknown>[]> = {
  readonly [K in keyof E]: InferEncoded<E[K]>;
};

/** Re-exported so `schema.optional`'s return type and consumers share one optional brand. */
export type { OptionalSchema };
