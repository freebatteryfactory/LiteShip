[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / LiteshipUniformUpdateDetail

# Interface: LiteshipUniformUpdateDetail

Defined in: web/dist/wire/liteship-events.d.ts:12

Uniform / boundary payload carried by state and GPU update events.

## Properties

### aria?

> `readonly` `optional` **aria?**: `Record`\<`string`, `string`\>

Defined in: web/dist/wire/liteship-events.d.ts:17

***

### css?

> `readonly` `optional` **css?**: `Record`\<`string`, `string` \| `number`\>

Defined in: web/dist/wire/liteship-events.d.ts:14

***

### discrete?

> `readonly` `optional` **discrete?**: `Record`\<`string`, `string`\>

Defined in: web/dist/wire/liteship-events.d.ts:13

***

### glsl?

> `readonly` `optional` **glsl?**: `Record`\<`string`, `number`\>

Defined in: web/dist/wire/liteship-events.d.ts:15

***

### state?

> `readonly` `optional` **state?**: `string`

Defined in: web/dist/wire/liteship-events.d.ts:19

Discrete crossing label on `liteship:graph-state`.

***

### wgsl?

> `readonly` `optional` **wgsl?**: `Record`\<`string`, `unknown`\>

Defined in: web/dist/wire/liteship-events.d.ts:16
