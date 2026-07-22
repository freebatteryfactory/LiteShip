[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [command/src](../README.md) / CheckAuthority

# Type Alias: CheckAuthority

> **CheckAuthority** = `"blocking"` \| `"advisory"`

Defined in: [command/src/checks/definition.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/command/src/checks/definition.ts#L54)

The authority a check holds over the aggregate verdict.
- `blocking` — a finding (or a non-zero exit) fails the run. The gates that block today.
- `advisory` — a finding surfaces but never blocks (reports, the raw bench runner, the audit report).
