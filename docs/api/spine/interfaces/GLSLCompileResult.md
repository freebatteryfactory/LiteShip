[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / GLSLCompileResult

# Interface: GLSLCompileResult

Defined in: [\_spine/compiler.d.ts:86](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L86)

GLSL source plus the uniforms and defines required to drive it.

## Properties

### bindUniforms

> `readonly` **bindUniforms**: `string`

Defined in: [\_spine/compiler.d.ts:91](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L91)

***

### declarations

> `readonly` **declarations**: `string`

Defined in: [\_spine/compiler.d.ts:90](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L90)

***

### defines

> `readonly` **defines**: readonly [`GLSLDefine`](GLSLDefine.md)[]

Defined in: [\_spine/compiler.d.ts:87](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L87)

***

### uniforms

> `readonly` **uniforms**: readonly [`GLSLUniform`](GLSLUniform.md)[]

Defined in: [\_spine/compiler.d.ts:88](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L88)

***

### uniformValues

> `readonly` **uniformValues**: `Record`\<`string`, `number`\>

Defined in: [\_spine/compiler.d.ts:89](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L89)
