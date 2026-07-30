[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [mcp-server/src](../README.md) / FindingRemediationLike

# Type Alias: FindingRemediationLike

> **FindingRemediationLike** = \{ `description`: `string`; `diff`: `string`; `kind`: `"patch"`; \} \| \{ `description`: `string`; `kind`: `"instruction"`; `steps`: readonly `string`[]; \}

Defined in: [mcp-server/src/lsp/types.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/mcp-server/src/lsp/types.ts#L48)

How to fix a finding — structurally identical to `@liteship/gauntlet`'s `Remediation`.
