[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / Remediation

# Type Alias: Remediation

> **Remediation** = \{ `description`: `string`; `diff`: `string`; `kind`: `"patch"`; \} \| \{ `description`: `string`; `kind`: `"instruction"`; `steps`: readonly `string`[]; \}

Defined in: [gauntlet/src/finding.ts:45](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/finding.ts#L45)

How to fix a finding. A `patch` is machine-applicable (an agent or the
`--fix` path can apply the diff under the raccoon rule); an `instruction`
is a precise, ordered work-list for a human or a planning agent. Either way
it is structured — never a vague "consider refactoring".
