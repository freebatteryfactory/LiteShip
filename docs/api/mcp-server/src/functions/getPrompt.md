[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / getPrompt

# Function: getPrompt()

> **getPrompt**(`name`, `args`): [`GetPromptResult`](../interfaces/GetPromptResult.md)

Defined in: [mcp-server/src/prompts.ts:67](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/prompts.ts#L67)

Resolve a prompt by name. Unknown prompt / missing / invalid argument → `ValidationError` (-32602).

## Parameters

### name

`string`

### args

`Readonly`\<`Record`\<`string`, `unknown`\>\>

## Returns

[`GetPromptResult`](../interfaces/GetPromptResult.md)
