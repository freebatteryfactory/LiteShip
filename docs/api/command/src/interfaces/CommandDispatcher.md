[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [command/src](../README.md) / CommandDispatcher

# Interface: CommandDispatcher

Defined in: [command/src/dispatcher.ts:20](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/dispatcher.ts#L20)

Structured command dispatcher built from the canonical command registry.

## Methods

### dispatch()

> **dispatch**\<`N`\>(`invocation`, `context`): `Promise`\<[`CapsuleCommandResult`](../type-aliases/CapsuleCommandResult.md)\<`N` *extends* keyof [`CommandMap`](CommandMap.md) ? [`CommandMap`](CommandMap.md)\[`N`\] : `unknown`\>\>

Defined in: [command/src/dispatcher.ts:29](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/dispatcher.ts#L29)

Resolve an invocation against the registry and run its handler. Generic over
the command NAME: when `N` is a `keyof CommandMap` literal (e.g. the string
`'glossary'`), the result's `payload` is typed `CommandMap[N]` at compile
time — no cast. A plain `string` name (an adapter forwarding a wire value)
widens to `unknown`, preserving the transport-neutral call the CLI/MCP skins
make. Never throws across the seam — every outcome is a structured result.

#### Type Parameters

##### N

`N` *extends* `string`

#### Parameters

##### invocation

###### args

`Readonly`\<`Record`\<`string`, `unknown`\>\>

###### name

`N`

##### context

[`CommandContext`](CommandContext.md)

#### Returns

`Promise`\<[`CapsuleCommandResult`](../type-aliases/CapsuleCommandResult.md)\<`N` *extends* keyof [`CommandMap`](CommandMap.md) ? [`CommandMap`](CommandMap.md)\[`N`\] : `unknown`\>\>
