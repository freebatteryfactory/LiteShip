/**
 * standard — the `~standard` (Standard Schema V1) conformance bridge for kernel
 * {@link Schema} values.
 *
 * Every kernel schema can be exposed as `StandardSchemaV1`. JSON-Schema hooks
 * are attached only when the caller supplies separate, derivable input and
 * decoded-output schemas; a representation-changing decoder must never publish
 * its encoded shape as the output contract.
 *
 * The `@standard-schema/spec` import is TYPE-ONLY — the package ships an empty
 * runtime `index.js` (verified) — so this module names the dependency `@liteship/core`
 * already declares (T017) without a runtime edge.
 *
 * DECODE is passed in, not imported: the kernel strict `decode` (schema/decode.ts,
 * a sibling slice of the same wave) is handed to {@link toStandardSchema}. The
 * bridge consumes only the `code` + `path` of each decode issue (via
 * {@link DecodeIssueView}), so the real `Result<A, readonly DecodeIssue[]>` the
 * decoder returns is accepted directly — no adapter at the wiring seam.
 *
 * @module
 */
import type { StandardSchemaV1, StandardJSONSchemaV1 } from '@standard-schema/spec';
import type { Result } from '@liteship/error';
import type { Schema } from './ast.js';
import { toJsonSchema } from './to-json-schema.js';

/** The vendor tag stamped on every bridged schema — the Standard Schema registry key. */
export const VENDOR = 'liteship';

/**
 * The subset of a kernel decode issue this bridge reads: its machine `code` and
 * its path from the decode root. The kernel `DecodeIssue` carries more (a
 * `cause`, a message); a real `DecodeIssue` is structurally a `DecodeIssueView`,
 * so `Result<A, readonly DecodeIssue[]>` is accepted wherever this is expected.
 */
export interface DecodeIssueView {
  /** The machine-readable failure code, e.g. `'schema/type'`, `'schema/missing'`. */
  readonly code: string;
  /** Path segments from the decode root to the offending value. */
  readonly path: readonly PropertyKey[];
}

/** A strict-decode outcome: the repo `Result` carrying a value or a fail-closed issue list. */
export type KernelDecodeResult<A> = Result<A, readonly DecodeIssueView[]>;

/** A strict decoder: schema + `unknown` → typed-or-issues (the shape of `decode`). */
export type SchemaDecoder<A, I> = (schema: Schema<A, I>, value: unknown) => KernelDecodeResult<A>;

/** Universal validation bridge. It deliberately promises no JSON projection. */
export type LiteshipStandardSchema<I, A> = StandardSchemaV1<I, A>;

/** Validation bridge with separately proven encoded-input and decoded-output projections. */
export type LiteshipStandardJsonSchema<I, A> = StandardSchemaV1<I, A> & StandardJSONSchemaV1<I, A>;

/** Explicit encoded-input and decoded-output schemas required to advertise JSON Schema hooks. */
export interface StandardJsonSchemaProjection<I, A> {
  /** Schema describing values before decode. */
  readonly input: Schema<I, I>;
  /** Schema describing values after decode. */
  readonly output: Schema<A, A>;
}

/**
 * Map a kernel {@link KernelDecodeResult} to a Standard Schema V1 validate
 * result: a success carries `{ value }`; a failure carries `{ issues }` whose
 * every entry is `{ message, path:[{key}, …] }` — the decode path lowered to
 * Standard's `PathSegment` list, so a consumer sees the exact offending field.
 * The `message` is the issue's machine `code` (the stable, decoder-owned reason).
 */
export function standardResultOf<A>(result: KernelDecodeResult<A>): StandardSchemaV1.Result<A> {
  if (result.ok) return { value: result.value };
  return {
    issues: result.error.map((issue) => ({ message: issue.code, path: issue.path.map((key) => ({ key })) })),
  };
}

/**
 * Bridge a kernel {@link Schema} to `StandardSchemaV1`. `~standard.validate`
 * runs `decode(schema, value)` and lowers its result. Pass an explicit
 * {@link StandardJsonSchemaProjection} to opt into JSON hooks. Both projections
 * are derived eagerly, before the hook is advertised, so an unsupported AST can
 * never become a delayed consumer crash.
 * `A` is the decoded type, `I` the encoded/input type (defaults to `A`); both are
 * phantom on the returned handle, sourced from the schema value.
 */
export function toStandardSchema<A, I = A>(
  schema: Schema<A, I>,
  decode: SchemaDecoder<A, I>,
): LiteshipStandardSchema<I, A>;
export function toStandardSchema<A, I = A>(
  schema: Schema<A, I>,
  decode: SchemaDecoder<A, I>,
  projection: StandardJsonSchemaProjection<I, A>,
): LiteshipStandardJsonSchema<I, A>;
export function toStandardSchema<A, I = A>(
  schema: Schema<A, I>,
  decode: SchemaDecoder<A, I>,
  projection?: StandardJsonSchemaProjection<I, A>,
): LiteshipStandardSchema<I, A> | LiteshipStandardJsonSchema<I, A> {
  const validation: StandardSchemaV1.Props<I, A> = {
    version: 1,
    vendor: VENDOR,
    validate: (value) => standardResultOf(decode(schema, value)),
  };
  if (projection === undefined) return { '~standard': validation };
  const input = toJsonSchema(projection.input);
  const output = toJsonSchema(projection.output);
  return {
    '~standard': {
      ...validation,
      jsonSchema: { input: () => input, output: () => output },
    },
  };
}
