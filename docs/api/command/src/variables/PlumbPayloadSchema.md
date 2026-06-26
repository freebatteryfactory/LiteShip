[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / PlumbPayloadSchema

# Variable: PlumbPayloadSchema

> `const` **PlumbPayloadSchema**: `Struct`\<\{ `generatedCorpusMessage`: `NullOr`\<`String`\>; `generatedPresent`: `Boolean`; `ok`: `Boolean`; `skips`: `$Array`\<`Struct`\<\{ `file`: `String`; `kind`: `String`; `message`: `String`; \}\>\>; `unclassified`: `$Array`\<`String`\>; \}\>

Defined in: [command/src/commands/plumb.ts:46](https://github.com/heyoub/LiteShip/blob/main/packages/command/src/commands/plumb.ts#L46)

Structured payload returned by `plumb` — ONE Effect Schema is the source of
both [PlumbPayload](../type-aliases/PlumbPayload.md) and the descriptor's `outputSchema`.
