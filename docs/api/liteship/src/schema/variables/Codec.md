[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/schema](../README.md) / Codec

# Variable: Codec

> `const` **Codec**: `object`

Defined in: core/dist/schema/codec.d.ts:30

Codec — typed sync encode/decode wrapper over a kernel [Schema](../interfaces/Schema.md). Gives a
single call site for schema-driven validation so consumers don't reach for the
kernel `decode` directly.

## Type Declaration

### make

> **make**: *typeof* `_make`

Wrap an identity kernel schema in the Codec facade.
