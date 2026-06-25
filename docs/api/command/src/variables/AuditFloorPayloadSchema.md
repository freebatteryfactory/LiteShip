[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / AuditFloorPayloadSchema

# Variable: AuditFloorPayloadSchema

> `const` **AuditFloorPayloadSchema**: `Struct`\<\{ `actualWarnings`: `Number`; `delta`: `Struct`\<\{ `added`: `$Array`\<`String`\>; `removed`: `$Array`\<`String`\>; \}\>; `errorCount`: `Number`; `expectedWarnings`: `Number`; `inventory`: `$Array`\<`String`\>; `ok`: `Boolean`; \}\>

Defined in: [command/src/commands/audit-floor.ts:33](https://github.com/heyoub/LiteShip/blob/main/packages/command/src/commands/audit-floor.ts#L33)

Structured payload returned by `audit-floor` — ONE Effect Schema is the source
of both [AuditFloorPayload](../type-aliases/AuditFloorPayload.md) and the descriptor's `outputSchema`. `delta`
is now a modelled nested struct (the validator recurses into it), tighter than
the old bare `{type:'object'}`.
