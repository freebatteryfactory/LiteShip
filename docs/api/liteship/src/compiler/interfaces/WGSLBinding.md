[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/compiler](../README.md) / WGSLBinding

# Interface: WGSLBinding

Defined in: compiler/dist/wgsl.d.ts:20

A single `@group(G) @binding(B) var<uniform> …` declaration.

## Properties

### binding

> `readonly` **binding**: `number`

Defined in: compiler/dist/wgsl.d.ts:24

Binding index within the group.

***

### group

> `readonly` **group**: `number`

Defined in: compiler/dist/wgsl.d.ts:22

Bind group index.

***

### name

> `readonly` **name**: `string`

Defined in: compiler/dist/wgsl.d.ts:26

Binding variable name.

***

### type

> `readonly` **type**: [`WGSLBindingType`](../type-aliases/WGSLBindingType.md)

Defined in: compiler/dist/wgsl.d.ts:28

Resolved primitive or struct type.
