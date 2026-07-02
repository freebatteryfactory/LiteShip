[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / WGSLBinding

# Interface: WGSLBinding

Defined in: [compiler/src/wgsl.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/wgsl.ts#L44)

A single `@group(G) @binding(B) var<uniform> …` declaration.

## Properties

### binding

> `readonly` **binding**: `number`

Defined in: [compiler/src/wgsl.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/wgsl.ts#L48)

Binding index within the group.

***

### group

> `readonly` **group**: `number`

Defined in: [compiler/src/wgsl.ts:46](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/wgsl.ts#L46)

Bind group index.

***

### name

> `readonly` **name**: `string`

Defined in: [compiler/src/wgsl.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/wgsl.ts#L50)

Binding variable name.

***

### type

> `readonly` **type**: `string`

Defined in: [compiler/src/wgsl.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/wgsl.ts#L52)

Resolved primitive or struct type.
