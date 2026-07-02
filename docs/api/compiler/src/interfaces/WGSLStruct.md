[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / WGSLStruct

# Interface: WGSLStruct

Defined in: [compiler/src/wgsl.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/wgsl.ts#L56)

A WGSL `struct { … }` definition produced by [WGSLCompiler.compile](../variables/WGSLCompiler.md#compile).

## Properties

### fields

> `readonly` **fields**: readonly `object`[]

Defined in: [compiler/src/wgsl.ts:60](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/wgsl.ts#L60)

Ordered fields; the first is always `state_index: u32`.

***

### name

> `readonly` **name**: `string`

Defined in: [compiler/src/wgsl.ts:58](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/wgsl.ts#L58)

Struct identifier (PascalCase, suffixed `State`).
