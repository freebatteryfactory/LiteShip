[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / FrameReader

# Interface: FrameReader

Defined in: [mcp-server/src/lsp/framing.ts:36](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/lsp/framing.ts#L36)

A stateful frame reader. Feed it incoming chunks (`push`); it returns the zero
or more complete JSON payload strings that became available. Bytes are
accumulated in a `Buffer` so a multi-byte UTF-8 character split across two TCP
chunks is never mis-sliced (the Content-Length is a BYTE count, decoded only
once a full frame is present).

## Properties

### push

> `readonly` **push**: (`chunk`) => readonly `string`[]

Defined in: [mcp-server/src/lsp/framing.ts:38](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/lsp/framing.ts#L38)

Feed a chunk; return every complete payload string the buffer now yields.

#### Parameters

##### chunk

`string` \| `Buffer`\<`ArrayBufferLike`\>

#### Returns

readonly `string`[]
