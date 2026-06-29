[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / GlossaryPayloadSchema

# Variable: GlossaryPayloadSchema

> `const` **GlossaryPayloadSchema**: `Struct`\<\{ `entries`: `$Array`\<`Struct`\<\{ `category`: `Union`\<readonly \[`Literal`\<`"naming"`\>, `Literal`\<`"primitive"`\>, `Literal`\<`"translator-note"`\>\]\>; `definition`: `String`; `seeAlso`: `optional`\<`$Array`\<`String`\>\>; `term`: `String`; \}\>\>; `term`: `NullOr`\<`String`\>; \}\>

Defined in: [command/src/commands/glossary.ts:32](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/glossary.ts#L32)

Structured payload returned by the glossary command — ONE Effect Schema is the
source of both [GlossaryPayload](../type-aliases/GlossaryPayload.md) and the descriptor's `outputSchema`
(derived below), so the TS type and the JSON-Schema cannot drift.
