/**
 * The schema-kernel barrel — the transport-agnostic successor to the Effect-AST
 * deriver (`../json-schema-from-schema.ts`). It gathers the one surface schema
 * consumers reach for: the `S.*` constructors, type-level `Infer`, the strict
 * and lenient `decode` contracts with their `DecodeIssue` algebra, the
 * `toJsonSchema` deriver, and the `~standard` (Standard Schema V1) bridge — all
 * over the frozen plain-data AST (`./ast.ts`).
 *
 * Everything here is effect-free: a kernel schema is structurally a
 * `SchemaPort<A, I>`, so `Infer` reads `A`/`I` off any port-shaped value without
 * this barrel importing `effect`.
 *
 * @module
 */

// ── Constructors + the branded schema value ─────────────────────────────────
export { S, withArbitrary } from './constructors.js';
export { isSchema, annotatedArbitrary } from './ast.js';
export type {
  Schema,
  SchemaNode,
  SchemaAnnotations,
  OptionalSchema,
  IsOptional,
  LiteralValue,
  BytesCtor,
  CarrierInstance,
  StringNode,
  NumberNode,
  BooleanNode,
  LiteralNode,
  UnionNode,
  StructNode,
  StructField,
  ArrayNode,
  RecordNode,
  UnknownNode,
  AnyNode,
  BytesNode,
  BrandNode,
  HoleNode,
} from './ast.js';

// ── Type-level inference ─────────────────────────────────────────────────────
export type { Infer, InferEncoded, SchemaFields, StructType, StructEncoded } from './infer.js';

// ── Decoders — strict (fail-closed) and lenient (coerce-or-null / prune) ─────
export { decode, decodeLenient, parseErrorFromIssues } from './decode.js';
export type { DecodeIssue, DecodeIssueCode, DecodePath, DecodeResult } from './decode.js';

// ── JSON-Schema deriver (kernel AST → structural dialect) ────────────────────
export { toJsonSchema } from './to-json-schema.js';
export type { JsonSchemaObject, JsonSchemaFragment } from './to-json-schema.js';

// ── `~standard` conformance bridge ───────────────────────────────────────────
export { toStandardSchema, standardResultOf, VENDOR } from './standard.js';
export type { LiteshipStandardSchema, DecodeIssueView, KernelDecodeResult, SchemaDecoder } from './standard.js';
