[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/compiler](../README.md) / GLSLUniform

# Interface: GLSLUniform

Defined in: compiler/dist/glsl.d.ts:15

A single GLSL uniform declaration produced by [GLSLCompiler.compile](../variables/GLSLCompiler.md#compile).

## Properties

### comment?

> `readonly` `optional` **comment?**: `string`

Defined in: compiler/dist/glsl.d.ts:21

Optional inline comment emitted alongside the declaration.

***

### name

> `readonly` **name**: `string`

Defined in: compiler/dist/glsl.d.ts:17

Uniform name (prefixed `u_`, snake-case).

***

### type

> `readonly` **type**: [`GLSLType`](../type-aliases/GLSLType.md)

Defined in: compiler/dist/glsl.d.ts:19

Inferred GLSL type; float when any state value is non-integer or negative.
