[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / defineCommand

# Function: defineCommand()

> **defineCommand**\<`R`, `Args`, `Payload`\>(`spec`): [`HandledCommand`](../interfaces/HandledCommand.md)

Defined in: [command/src/registry.ts:572](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/registry.ts#L572)

Register a finite command with COMPILE-TIME capability narrowing (T053). The
`requires` tuple is captured as a `const` type parameter `R`, so the handler's
`context` is typed `CommandContext & Required<Pick<CommandContext, R[number]>>`
— the declared capabilities are non-optional inside the handler, no per-handler
presence check needed. The dispatcher still enforces `requires` at RUNTIME
(residue for dynamically-built hosts), so the one variance bridge below — the
narrowed-context handler stored under the uniform [CapsuleCommandHandler](../interfaces/CapsuleCommandHandler.md)
— is sound: the dispatcher never calls the handler until the runtime guard has
confirmed every declared capability is present.

## Type Parameters

### R

`R` *extends* readonly [`CommandCapability`](../type-aliases/CommandCapability.md)[] = readonly \[\]

### Args

`Args` *extends* `Readonly`\<`Record`\<`string`, `unknown`\>\> = `Readonly`\<`Record`\<`string`, `unknown`\>\>

### Payload

`Payload` = `unknown`

## Parameters

### spec

#### argsSchema?

`Schema`\<`Args`, `Args`\>

#### descriptor

`Omit`\<`CapsuleCommandDescriptor`, `"requires"`\> & `object`

#### handler

(`invocation`, `context`) => `Promise`\<[`CapsuleCommandResult`](../type-aliases/CapsuleCommandResult.md)\<`Payload`\>\>

## Returns

[`HandledCommand`](../interfaces/HandledCommand.md)
