[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / AuditPayloadSchema

# Variable: AuditPayloadSchema

> `const` **AuditPayloadSchema**: `Struct`\<\{ `errorCount`: `Number`; `findingCount`: `Number`; `findings`: `optional`\<`$Array`\<`Struct`\<\{ `id`: `String`; `location`: `optional`\<`Struct`\<\{ `column`: `optional`\<`Number`\>; `file`: `String`; `line`: `optional`\<`Number`\>; \}\>\>; `rule`: `String`; `section`: `String`; `severity`: `Union`\<readonly \[`Literal`\<`"error"`\>, `Literal`\<`"warning"`\>, `Literal`\<`"info"`\>\]\>; `summary`: `String`; `title`: `String`; \}\>\>\>; `infoCount`: `Number`; `passFindingCounts`: `Struct`\<\{ `integrity`: `Number`; `structure`: `Number`; `surface`: `Number`; \}\>; `profileSource`: `Union`\<readonly \[`Literal`\<`"default"`\>, `Literal`\<`"file"`\>, `Literal`\<`"consumer"`\>\]\>; `repoRoot`: `String`; `suppressedCount`: `Number`; `warningCount`: `Number`; \}\>

Defined in: [command/src/commands/audit.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/commands/audit.ts#L48)

Structured payload returned by `audit` — ONE Effect Schema is the source of
both [AuditPayload](../type-aliases/AuditPayload.md) and the descriptor's `outputSchema`.
