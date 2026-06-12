[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / StartOpts

# Interface: StartOpts

Defined in: [mcp-server/src/start.ts:11](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/start.ts#L11)

Options for `start`.

## Properties

### http?

> `readonly` `optional` **http?**: `string` \| `number`

Defined in: [mcp-server/src/start.ts:20](https://github.com/heyoub/LiteShip/blob/main/packages/mcp-server/src/start.ts#L20)

HTTP bind. Accepted shapes:
  - a port number — `3838` (binds 127.0.0.1)
  - `':PORT'` — `':3838'` (binds 127.0.0.1)
  - `'PORT'` — `'3838'` (binds 127.0.0.1)
  - `'HOST:PORT'` — `'0.0.0.0:3838'`
Any other string is rejected with a teaching error before the server binds.
