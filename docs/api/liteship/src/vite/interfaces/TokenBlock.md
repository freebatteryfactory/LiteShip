[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/vite](../README.md) / TokenBlock

# Interface: TokenBlock

Defined in: vite/dist/token-transform.d.ts:14

Parsed `@token` block: the token to emit and any inline overrides.

## Properties

### declarations

> `readonly` **declarations**: `Record`\<`string`, `string`\>

Defined in: vite/dist/token-transform.d.ts:18

Inline overrides (`{ cssProp: value }`).

***

### line

> `readonly` **line**: `number`

Defined in: vite/dist/token-transform.d.ts:22

1-based line where the block begins.

***

### sourceFile

> `readonly` **sourceFile**: `string`

Defined in: vite/dist/token-transform.d.ts:20

Absolute source file path.

***

### tokenName

> `readonly` **tokenName**: `string`

Defined in: vite/dist/token-transform.d.ts:16

Named token (resolved against exported `TokenDef` values).
