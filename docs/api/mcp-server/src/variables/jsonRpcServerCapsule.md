[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [mcp-server/src](../README.md) / jsonRpcServerCapsule

# Variable: jsonRpcServerCapsule

> `const` **jsonRpcServerCapsule**: `CapsuleDef`\<`"pureTransform"`, `string`, \{ `inputKind`: `"request"` \| `"notification"` \| `"batch"` \| `"parse-error"` \| `"invalid-request"`; `malformedKind`: `"request"` \| `"notification"` \| `"batch"` \| `"parse-error"` \| `"invalid-request"`; `notificationKind`: `"request"` \| `"notification"` \| `"batch"` \| `"parse-error"` \| `"invalid-request"`; `requestCorrelationId`: `string` \| `number` \| `null`; \}, `unknown`\>

Defined in: [mcp-server/src/jsonrpc.ts:227](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/jsonrpc.ts#L227)

Capsule definition for the kernel — placed in the catalog under the
`pureTransform` arm so the factory compiler emits a generated test +
bench pair and the manifest tracks the kernel's content address.
