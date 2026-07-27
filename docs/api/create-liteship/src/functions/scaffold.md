[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [create-liteship/src](../README.md) / scaffold

# Function: scaffold()

> **scaffold**(`targetDir`, `options?`): [`ScaffoldResult`](../interfaces/ScaffoldResult.md)

Defined in: [create-liteship/src/scaffold.ts:195](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/create-liteship/src/scaffold.ts#L195)

Scaffold the default template into `targetDir`.

Refuses with a typed [ScaffoldError](../interfaces/ScaffoldError.md) when the target would be
overwritten, the template is missing/incomplete/ambiguous, source and target
overlap, or the staged tree cannot be published. The destination is touched
only after the complete staged scaffold is ready; an existing empty directory
remains an admitted target.

## Parameters

### targetDir

`string`

### options?

[`ScaffoldOptions`](../interfaces/ScaffoldOptions.md) = `{}`

## Returns

[`ScaffoldResult`](../interfaces/ScaffoldResult.md)
