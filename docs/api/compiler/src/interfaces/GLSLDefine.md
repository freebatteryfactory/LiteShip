[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / GLSLDefine

# Interface: GLSLDefine

Defined in: [compiler/src/glsl.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/glsl.ts#L48)

A single GLSL `#define` produced by [GLSLCompiler.compile](../variables/GLSLCompiler.md#compile).

## Properties

### comment?

> `readonly` `optional` **comment?**: `string`

Defined in: [compiler/src/glsl.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/glsl.ts#L54)

Optional inline comment emitted alongside the `#define`.

***

### name

> `readonly` **name**: `string`

Defined in: [compiler/src/glsl.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/glsl.ts#L50)

Macro name (`STATE_*` or `STATE_COUNT`).

***

### value

> `readonly` **value**: `string`

Defined in: [compiler/src/glsl.ts:52](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/glsl.ts#L52)

Macro value (always numeric, serialized as a string).
