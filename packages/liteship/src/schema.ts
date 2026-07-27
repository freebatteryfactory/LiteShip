/**
 * `liteship/schema` — the curated facade over `@liteship/core/schema`: the
 * transport-agnostic (effect-free) schema kernel. The `schema.*` constructors,
 * type-level `Infer`, strict/lenient `decode` with the `DecodeIssue` algebra, the
 * `toJsonSchema` deriver, the `~standard` bridge, the branded id constructors, the
 * canonical CBOR encoder, the `SchemaPort` contract, the `Quantizer` type family,
 * and the `Codec` pair. Curated named re-exports only — no behavior lives here.
 * @module
 */

export { schema, withArbitrary, isSchema, annotatedArbitrary } from '@liteship/core/schema';
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
} from '@liteship/core/schema';

export type {
  Infer,
  InferEncoded,
  SchemaFields,
  StructType,
  StructEncoded,
  TupleType,
  TupleEncoded,
} from '@liteship/core/schema';

export { decode, decodeLenient, parseErrorFromIssues } from '@liteship/core/schema';
export type { DecodeIssue, DecodeIssueCode, DecodePath, DecodeResult } from '@liteship/core/schema';

export { toJsonSchema } from '@liteship/core/schema';
export type { JsonSchemaObject, JsonSchemaFragment } from '@liteship/core/schema';

export { toStandardSchema, standardResultOf, VENDOR } from '@liteship/core/schema';
export type { LiteshipStandardSchema, DecodeIssueView, KernelDecodeResult, SchemaDecoder } from '@liteship/core/schema';

export {
  SignalInput,
  ThresholdValue,
  StateName,
  ContentAddress,
  IntegrityDigest,
  TokenRef,
  Millis,
} from '@liteship/core/schema';
export type { HLCBrand } from '@liteship/core/schema';

export { CanonicalCbor } from '@liteship/core/schema';

export { asDeclaration } from '@liteship/core/schema';
export type { SchemaPort, DeclarationSchema } from '@liteship/core/schema';

export type {
  Quantizer,
  ReactiveQuantizer,
  CompositorQuantizer,
  QuantizerState,
  QuantizerCrossings,
} from '@liteship/core/schema';

export type { CellKind, CellMeta, CellEnvelope } from '@liteship/core/schema';

export { Codec } from '@liteship/core/schema';
