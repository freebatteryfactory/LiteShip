[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/compiler](../README.md) / GLSLDefine

# Interface: GLSLDefine

Defined in: compiler/dist/glsl.d.ts:24

A single GLSL `#define` produced by [GLSLCompiler.compile](../variables/GLSLCompiler.md#compile).

## Properties

### comment?

> `readonly` `optional` **comment?**: `string`

Defined in: compiler/dist/glsl.d.ts:30

Optional inline comment emitted alongside the `#define`.

***

### name

> `readonly` **name**: `string`

Defined in: compiler/dist/glsl.d.ts:26

Macro name (`STATE_*` or `STATE_COUNT`).

***

### value

> `readonly` **value**: `string`

Defined in: compiler/dist/glsl.d.ts:28

Macro value (always numeric, serialized as a string).
