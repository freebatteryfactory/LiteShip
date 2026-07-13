[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ProgramUniforms

# Interface: ProgramUniforms

Defined in: [core/src/transition-program.ts:582](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/transition-program.ts#L582)

The uniform payload a `sampleProgram` sample projects to: formatted CSS + GPU-bound WGSL scalars.

## Properties

### css

> `readonly` **css**: `Record`\<`string`, `string`\>

Defined in: [core/src/transition-program.ts:584](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/transition-program.ts#L584)

Every animated `cssVar` formatted for a CSS custom-property / style write.

***

### wgsl

> `readonly` **wgsl**: `Record`\<`string`, `number`\>

Defined in: [core/src/transition-program.ts:586](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/transition-program.ts#L586)

GPU-bound numeric props (kind `number`/`opacity`) keyed by their WGSL struct field.
