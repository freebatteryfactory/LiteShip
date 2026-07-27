[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / AuditRuleId

# Type Alias: AuditRuleId

> **AuditRuleId** = `Extract`\<[`DiagnosticCode`](../../../liteship/src/evidence/type-aliases/DiagnosticCode.md), `` `audit/${string}` ``\> *extends* `` `audit/${infer Rule}` `` ? `Rule` : `never`

Defined in: [audit/src/types.ts:12](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L12)

Stable audit rule slug, derived from the canonical diagnostic registry.
