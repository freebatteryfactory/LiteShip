[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / getPrompt

# Function: getPrompt()

> **getPrompt**(`name`, `args`): [`GetPromptResult`](../interfaces/GetPromptResult.md)

Defined in: [mcp-server/src/prompts.ts:61](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/prompts.ts#L61)

Resolve a prompt by name. Unknown prompt / missing / invalid argument → InvalidParamsError (-32602).

## Parameters

### name

`string`

### args

`Readonly`\<`Record`\<`string`, `unknown`\>\>

## Returns

[`GetPromptResult`](../interfaces/GetPromptResult.md)
