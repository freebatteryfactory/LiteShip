[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / liteship/src/schema

# liteship/src/schema

`liteship/schema` — the curated facade over `@liteship/core/schema`: the
transport-agnostic (effect-free) schema kernel. The `schema.*` constructors,
type-level `Infer`, strict/lenient `decode` with the `DecodeIssue` algebra, the
`toJsonSchema` deriver, the `~standard` bridge, the branded id constructors, the
canonical CBOR encoder, the `SchemaPort` contract, the `Quantizer` type family,
and the `Codec` pair. Curated named re-exports only — no behavior lives here.

## Interfaces

- [AnyNode](interfaces/AnyNode.md)
- [ArrayNode](interfaces/ArrayNode.md)
- [BooleanNode](interfaces/BooleanNode.md)
- [BrandNode](interfaces/BrandNode.md)
- [BytesNode](interfaces/BytesNode.md)
- [CellEnvelope](interfaces/CellEnvelope.md)
- [CellMeta](interfaces/CellMeta.md)
- [DeclarationSchema](interfaces/DeclarationSchema.md)
- [DecodeIssue](interfaces/DecodeIssue.md)
- [DecodeIssueView](interfaces/DecodeIssueView.md)
- [HLCBrand](interfaces/HLCBrand.md)
- [HoleNode](interfaces/HoleNode.md)
- [LiteralNode](interfaces/LiteralNode.md)
- [NumberNode](interfaces/NumberNode.md)
- [ReactiveQuantizer](interfaces/ReactiveQuantizer.md)
- [RecordNode](interfaces/RecordNode.md)
- [Schema](interfaces/Schema.md)
- [SchemaPort](interfaces/SchemaPort.md)
- [StringNode](interfaces/StringNode.md)
- [StructField](interfaces/StructField.md)
- [StructNode](interfaces/StructNode.md)
- [TupleNode](interfaces/TupleNode.md)
- [UnionNode](interfaces/UnionNode.md)
- [UnknownNode](interfaces/UnknownNode.md)

## Type Aliases

- [BytesCtor](type-aliases/BytesCtor.md)
- [CarrierInstance](type-aliases/CarrierInstance.md)
- [CellKind](type-aliases/CellKind.md)
- [Codec](type-aliases/Codec.md)
- [ContentAddress](type-aliases/ContentAddress.md)
- [DecodeIssueCode](type-aliases/DecodeIssueCode.md)
- [DecodePath](type-aliases/DecodePath.md)
- [DecodeResult](type-aliases/DecodeResult.md)
- [Infer](type-aliases/Infer.md)
- [InferEncoded](type-aliases/InferEncoded.md)
- [IntegrityDigest](type-aliases/IntegrityDigest.md)
- [IsOptional](type-aliases/IsOptional.md)
- [JsonSchemaFragment](type-aliases/JsonSchemaFragment.md)
- [JsonSchemaObject](type-aliases/JsonSchemaObject.md)
- [KernelDecodeResult](type-aliases/KernelDecodeResult.md)
- [LiteralValue](type-aliases/LiteralValue.md)
- [LiteshipStandardSchema](type-aliases/LiteshipStandardSchema.md)
- [Millis](type-aliases/Millis.md)
- [OptionalSchema](type-aliases/OptionalSchema.md)
- [QuantizerState](type-aliases/QuantizerState.md)
- [SchemaAnnotations](type-aliases/SchemaAnnotations.md)
- [SchemaDecoder](type-aliases/SchemaDecoder.md)
- [SchemaFields](type-aliases/SchemaFields.md)
- [SchemaNode](type-aliases/SchemaNode.md)
- [SignalInput](type-aliases/SignalInput.md)
- [StateName](type-aliases/StateName.md)
- [StructEncoded](type-aliases/StructEncoded.md)
- [StructType](type-aliases/StructType.md)
- [ThresholdValue](type-aliases/ThresholdValue.md)
- [TokenRef](type-aliases/TokenRef.md)
- [TupleEncoded](type-aliases/TupleEncoded.md)
- [TupleType](type-aliases/TupleType.md)

## Variables

- [Codec](variables/Codec.md)
- [ContentAddress](variables/ContentAddress.md)
- [IntegrityDigest](variables/IntegrityDigest.md)
- [Millis](variables/Millis.md)
- [SignalInput](variables/SignalInput.md)
- [StateName](variables/StateName.md)
- [ThresholdValue](variables/ThresholdValue.md)
- [TokenRef](variables/TokenRef.md)
- [VENDOR](variables/VENDOR.md)

## Functions

- [annotatedArbitrary](functions/annotatedArbitrary.md)
- [asDeclaration](functions/asDeclaration.md)
- [decode](functions/decode.md)
- [decodeLenient](functions/decodeLenient.md)
- [isSchema](functions/isSchema.md)
- [parseErrorFromIssues](functions/parseErrorFromIssues.md)
- [standardResultOf](functions/standardResultOf.md)
- [toJsonSchema](functions/toJsonSchema.md)
- [toStandardSchema](functions/toStandardSchema.md)
- [withArbitrary](functions/withArbitrary.md)

## References

### CanonicalCbor

Re-exports [CanonicalCbor](../../../core/src/variables/CanonicalCbor.md)

***

### CompositorQuantizer

Re-exports [CompositorQuantizer](../../../core/src/type-aliases/CompositorQuantizer.md)

***

### Quantizer

Re-exports [Quantizer](../interfaces/Quantizer.md)

***

### QuantizerCrossings

Re-exports [QuantizerCrossings](../../../core/src/type-aliases/QuantizerCrossings.md)

***

### schema

Re-exports [schema](../variables/schema.md)
