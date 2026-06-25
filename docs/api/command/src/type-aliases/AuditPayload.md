[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / AuditPayload

# Type Alias: AuditPayload

> **AuditPayload** = `Omit`\<`Schema.Schema.Type`\<*typeof* [`AuditPayloadSchema`](../variables/AuditPayloadSchema.md)\>, `"findings"`\> & `object`

Defined in: [command/src/commands/audit.ts:73](https://github.com/heyoub/LiteShip/blob/main/packages/command/src/commands/audit.ts#L73)

Structured payload returned by `audit`. Single-source-derived for every field
EXCEPT `findings`, which keeps the canonical AuditEngineFinding type
(so `metadata` — an open record the outputSchema's dialect can't express —
stays in the type and is never narrowed away). The `outputSchema` is derived
from `AuditPayloadSchema` (findings minus metadata); the type is a faithful
superset on exactly that one field.

## Type Declaration

### findings?

> `readonly` `optional` **findings?**: readonly `AuditEngineFinding`[]
