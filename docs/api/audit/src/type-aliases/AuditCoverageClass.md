[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / AuditCoverageClass

# Type Alias: AuditCoverageClass

> **AuditCoverageClass** = `"clean"` \| `"symbol-evidenced"` \| `"file-proxy-only"` \| `"allowlisted"` \| `"policy-absent"` \| `"not-checked"`

Defined in: [audit/src/types.ts:24](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/types.ts#L24)

Audit self-trust coverage class (CUT A0). Every audit check result carries one
of these so a clean result can never be silently confused with an unchecked one.
