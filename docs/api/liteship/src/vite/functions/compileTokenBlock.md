[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/vite](../README.md) / compileTokenBlock

# Function: compileTokenBlock()

> **compileTokenBlock**(`block`, `token`): `string`

Defined in: vite/dist/token-transform.d.ts:48

Compile a parsed [TokenBlock](../interfaces/TokenBlock.md) plus a resolved `TokenDef` into
CSS custom property declarations. Delegates to the canonical
`TokenCSSCompiler` to avoid duplicating token-to-CSS logic.

## Parameters

### block

[`TokenBlock`](../interfaces/TokenBlock.md)

### token

[`Token`](../../type-aliases/Token.md)

## Returns

`string`
