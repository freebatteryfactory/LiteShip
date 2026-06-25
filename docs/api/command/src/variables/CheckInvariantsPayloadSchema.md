[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CheckInvariantsPayloadSchema

# Variable: CheckInvariantsPayloadSchema

> `const` **CheckInvariantsPayloadSchema**: `Struct`\<\{ `groups`: `$Array`\<`Struct`\<\{ `message`: `String`; `name`: `String`; `violations`: `$Array`\<`Struct`\<\{ `content`: `String`; `file`: `String`; `line`: `Number`; \}\>\>; \}\>\>; `lineEndings`: `$Array`\<`String`\>; `ok`: `Boolean`; \}\>

Defined in: [command/src/commands/check-invariants.ts:54](https://github.com/heyoub/LiteShip/blob/main/packages/command/src/commands/check-invariants.ts#L54)

Structured payload returned by `check-invariants` — ONE Effect Schema is the
source of both [CheckInvariantsPayload](../type-aliases/CheckInvariantsPayload.md) and the descriptor's
`outputSchema`.
