[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CheckPayload

# Type Alias: CheckPayload

> **CheckPayload** = `Omit`\<`Schema.Schema.Type`\<*typeof* [`CheckPayloadSchema`](../variables/CheckPayloadSchema.md)\>, `"findings"`\> & `object`

Defined in: [command/src/commands/check.ts:95](https://github.com/heyoub/LiteShip/blob/main/packages/command/src/commands/check.ts#L95)

Structured payload returned by `check`. Single-source-derived for every field
EXCEPT `findings`, which keeps the canonical `@czap/gauntlet` `Finding` type
(so `remediation` — undescribable in the outputSchema's dialect — stays in the
type and is never narrowed away from a consumer). The `outputSchema` is derived
from `CheckPayloadSchema` (findings minus remediation); the type is a faithful
superset on exactly that one field.

## Type Declaration

### findings

> `readonly` **findings**: readonly `Finding`[]
