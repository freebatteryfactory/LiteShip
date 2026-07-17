[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / JsonRpcErrorResponse

# Interface: JsonRpcErrorResponse

Defined in: [mcp-server/src/jsonrpc.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/jsonrpc.ts#L54)

Error response per §5 + §5.1.

## Properties

### error

> `readonly` **error**: `object`

Defined in: [mcp-server/src/jsonrpc.ts:57](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/jsonrpc.ts#L57)

#### code

> `readonly` **code**: `number`

#### data?

> `readonly` `optional` **data?**: `unknown`

#### message

> `readonly` **message**: `string`

***

### id

> `readonly` **id**: [`JsonRpcId`](../type-aliases/JsonRpcId.md)

Defined in: [mcp-server/src/jsonrpc.ts:56](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/jsonrpc.ts#L56)

***

### jsonrpc

> `readonly` **jsonrpc**: `"2.0"`

Defined in: [mcp-server/src/jsonrpc.ts:55](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/jsonrpc.ts#L55)
