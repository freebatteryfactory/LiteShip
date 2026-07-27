[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / WGSLCompileResult

# Interface: WGSLCompileResult

Defined in: [\_spine/compiler.d.ts:145](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L145)

WGSL source plus its bindings, uniforms, and generated structures.

## Properties

### bindings

> `readonly` **bindings**: readonly [`WGSLBinding`](WGSLBinding.md)[]

Defined in: [\_spine/compiler.d.ts:147](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L147)

***

### bindingValues

> `readonly` **bindingValues**: `Record`\<`string`, [`WGSLUniformValue`](../type-aliases/WGSLUniformValue.md)\>

Defined in: [\_spine/compiler.d.ts:148](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L148)

***

### declarations

> `readonly` **declarations**: `string`

Defined in: [\_spine/compiler.d.ts:150](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L150)

***

### stateBindings

> `readonly` **stateBindings**: `Record`\<`string`, `Record`\<`string`, [`WGSLUniformValue`](../type-aliases/WGSLUniformValue.md)\>\>

Defined in: [\_spine/compiler.d.ts:149](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L149)

***

### structs

> `readonly` **structs**: readonly [`WGSLStruct`](WGSLStruct.md)[]

Defined in: [\_spine/compiler.d.ts:146](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L146)
