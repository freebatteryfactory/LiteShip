[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/schema](../README.md) / asDeclaration

# Function: asDeclaration()

> **asDeclaration**\<`T`\>(`schema`): [`DeclarationSchema`](../interfaces/DeclarationSchema.md)\<`T`\>

Defined in: core/dist/schema/schema-port.d.ts:47

Brand a schema value as a [DeclarationSchema](../interfaces/DeclarationSchema.md). The `unique symbol` tag
is PHANTOM — it has no runtime slot — so this is a pure type-level assertion:
the value is returned byte-for-byte unchanged (still the effect `Schema` value
the caller passed, still decoded by `TypeValidator` until the kernel lands).

Accepts any [SchemaPort](../interfaces/SchemaPort.md) (every effect `Schema`/`Codec` value satisfies
it structurally) and narrows it to `DeclarationSchema<T>`, so slots that
declare a not-arbitrary-derivable domain (raw bytes, opaque carriers) can be
built WITHOUT an `as unknown as` double-cast. Because `DeclarationSchema<T>`
is a structural subtype of `SchemaPort<T>` (it only ADDS the phantom brand),
the assertion is a plain downcast — never a cast through `unknown`.

## Type Parameters

### T

`T`

## Parameters

### schema

[`SchemaPort`](../interfaces/SchemaPort.md)\<`T`\>

## Returns

[`DeclarationSchema`](../interfaces/DeclarationSchema.md)\<`T`\>
