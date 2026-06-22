[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / encodeFrame

# Function: encodeFrame()

> **encodeFrame**(`payload`): `string`

Defined in: [mcp-server/src/lsp/framing.ts:105](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/lsp/framing.ts#L105)

Wrap a JSON payload string in its LSP frame: the `Content-Length` header (the
UTF-8 BYTE length, not the character count), a blank line, then the payload.
PURE: a string transform.

## Parameters

### payload

`string`

## Returns

`string`
