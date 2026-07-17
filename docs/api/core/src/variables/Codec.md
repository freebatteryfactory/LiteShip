[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Codec

# Variable: Codec

> `const` **Codec**: `object`

Defined in: [core/src/codec.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/codec.ts#L46)

Codec — typed sync encode/decode wrapper over a kernel [Schema](../interfaces/Schema.md). Gives a
single call site for schema-driven validation so consumers don't reach for the
kernel `decode` directly.

## Type Declaration

### make

> **make**: \<`A`\>(`schema`) => `CodecShape`\<`A`, `A`\> = `_make`

Wrap an identity kernel schema in the [Codec.Shape](../namespaces/Codec/type-aliases/Shape.md) facade.

#### Type Parameters

##### A

`A`

#### Parameters

##### schema

[`Schema`](../interfaces/Schema.md)\<`A`, `A`\>

#### Returns

`CodecShape`\<`A`, `A`\>
