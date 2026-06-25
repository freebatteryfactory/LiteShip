[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CheckPayloadSchema

# Variable: CheckPayloadSchema

> `const` **CheckPayloadSchema**: `Struct`\<\{ `blocked`: `Boolean`; `findingCount`: `Number`; `findings`: `$Array`\<`Struct`\<\{ `detail`: `String`; `level`: `Union`\<readonly \[`Literal`\<`"L0"`\>, `Literal`\<`"L1"`\>, `Literal`\<`"L2"`\>, `Literal`\<`"L3"`\>, `Literal`\<`"L4"`\>\]\>; `location`: `optional`\<`Struct`\<\{ `column`: `optional`\<`Number`\>; `file`: `String`; `line`: `optional`\<`Number`\>; \}\>\>; `ruleId`: `String`; `severity`: `Union`\<readonly \[`Literal`\<`"advisory"`\>, `Literal`\<`"warning"`\>, `Literal`\<`"error"`\>\]\>; `title`: `String`; \}\>\>; `ok`: `Boolean`; \}\>

Defined in: [command/src/commands/check.ts:77](https://github.com/heyoub/LiteShip/blob/main/packages/command/src/commands/check.ts#L77)

Structured payload returned by `check` — the WELD-2 Finding-carrying shape. The
`findings` ARE plain JSON-serializable Finding data (ruleId, severity,
level, title, detail, location?, remediation?), so they ride the
`CapsuleCommandResult` payload straight through the MCP dispatch's
`structuredContent` and the CLI receipt with no separate adapter. `blocked`
mirrors the engine's single blocking verdict; `ok` is its negation.
