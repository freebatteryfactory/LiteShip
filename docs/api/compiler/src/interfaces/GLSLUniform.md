[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [compiler/src](../README.md) / GLSLUniform

# Interface: GLSLUniform

Defined in: [compiler/src/glsl.ts:38](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/glsl.ts#L38)

A single GLSL uniform declaration produced by [GLSLCompiler.compile](../variables/GLSLCompiler.md#compile).

## Properties

### comment?

> `readonly` `optional` **comment?**: `string`

Defined in: [compiler/src/glsl.ts:44](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/glsl.ts#L44)

Optional inline comment emitted alongside the declaration.

***

### name

> `readonly` **name**: `string`

Defined in: [compiler/src/glsl.ts:40](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/glsl.ts#L40)

Uniform name (prefixed `u_`, snake-case).

***

### type

> `readonly` **type**: [`GLSLType`](../type-aliases/GLSLType.md)

Defined in: [compiler/src/glsl.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/compiler/src/glsl.ts#L42)

Inferred GLSL type; float when any state value is non-integer or negative.
