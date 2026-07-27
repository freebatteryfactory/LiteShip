[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/compiler](../README.md) / WGSLStruct

# Interface: WGSLStruct

Defined in: compiler/dist/wgsl.d.ts:31

A WGSL `struct { … }` definition produced by [WGSLCompiler.compile](../variables/WGSLCompiler.md#compile).

## Properties

### fields

> `readonly` **fields**: readonly `object`[]

Defined in: compiler/dist/wgsl.d.ts:35

Ordered fields; the first is always `state_index: u32`.

***

### name

> `readonly` **name**: `string`

Defined in: compiler/dist/wgsl.d.ts:33

Struct identifier (PascalCase, suffixed `State`).
