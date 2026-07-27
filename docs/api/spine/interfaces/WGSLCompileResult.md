[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / WGSLCompileResult

# Interface: WGSLCompileResult

Defined in: [\_spine/compiler.d.ts:157](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L157)

WGSL source plus its bindings, uniforms, and generated structures.

## Properties

### bindings

> `readonly` **bindings**: readonly [`WGSLBinding`](WGSLBinding.md)[]

Defined in: [\_spine/compiler.d.ts:159](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L159)

***

### bindingValues

> `readonly` **bindingValues**: `Record`\<`string`, [`WGSLUniformValue`](../type-aliases/WGSLUniformValue.md)\>

Defined in: [\_spine/compiler.d.ts:160](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L160)

***

### declarations

> `readonly` **declarations**: `string`

Defined in: [\_spine/compiler.d.ts:162](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L162)

***

### stateBindings

> `readonly` **stateBindings**: `Record`\<`string`, `Record`\<`string`, [`WGSLUniformValue`](../type-aliases/WGSLUniformValue.md)\>\>

Defined in: [\_spine/compiler.d.ts:161](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L161)

***

### structs

> `readonly` **structs**: readonly [`WGSLStruct`](WGSLStruct.md)[]

Defined in: [\_spine/compiler.d.ts:158](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/compiler.d.ts#L158)
