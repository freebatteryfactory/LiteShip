/**
 * The schema-kernel barrel — the transport-agnostic successor to the now-deleted
 * Effect-AST deriver. It gathers the one surface schema
 * consumers reach for: the `schema.*` constructors, type-level `Infer`, the strict
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
export { schema, withArbitrary } from './constructors.js';
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
  TupleNode,
} from './ast.js';

// ── Type-level inference ─────────────────────────────────────────────────────
export type { Infer, InferEncoded, SchemaFields, StructType, StructEncoded, TupleType, TupleEncoded } from './infer.js';

// ── Decoders — strict (fail-closed) and lenient (coerce-or-null / prune) ─────
export { decode, decodeLenient, parseErrorFromIssues } from './decode.js';
export type { DecodeIssue, DecodeIssueCode, DecodePath, DecodeResult } from './decode.js';

// ── JSON-Schema deriver (kernel AST → structural dialect) ────────────────────
export { toJsonSchema } from './to-json-schema.js';
export type { JsonSchemaObject, JsonSchemaFragment } from './to-json-schema.js';

// ── `~standard` conformance bridge ───────────────────────────────────────────
export { toStandardSchema, standardResultOf, VENDOR } from './standard.js';
export type { LiteshipStandardSchema, DecodeIssueView, KernelDecodeResult, SchemaDecoder } from './standard.js';

// ── Moved-in kernels (core migration) — the effect-free schema neighbours that
// now live under schema/: the branded id constructors + HLC brand (brands.ts),
// the SchemaPort structural contract (schema-port.ts), the reactive/compositor
// Quantizer types (quantizer-types.ts), the Codec pair (codec.ts), the canonical
// CBOR encoder (cbor.ts), and the Cell wire envelope types (protocol.ts). These
// are curated named re-exports — the withheld internals (e.g. brand) stay unexported.

export { SignalInput, ThresholdValue, StateName, ContentAddress, IntegrityDigest, TokenRef, Millis } from './brands.js';

export type { HLC as HLCBrand } from './brands.js';

export { CanonicalCbor } from './cbor.js';

export { asDeclaration } from './schema-port.js';

export type { SchemaPort, DeclarationSchema } from './schema-port.js';

export type {
  Quantizer,
  ReactiveQuantizer,
  CompositorQuantizer,
  QuantizerState,
  QuantizerCrossings,
} from './quantizer-types.js';

export type { CellKind, CellMeta, CellEnvelope } from './protocol.js';

export { Codec } from './codec.js';
