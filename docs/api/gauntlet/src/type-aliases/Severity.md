[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / Severity

# Type Alias: Severity

> **Severity** = `"advisory"` \| `"warning"` \| `"error"`

Defined in: [gauntlet/src/finding.ts:27](https://github.com/heyoub/LiteShip/blob/main/packages/gauntlet/src/finding.ts#L27)

How loud a finding is. `advisory` is the authority ratchet's pre-blocking
tier — a real finding that does NOT yet fail the gate (it is calibrating).
`warning` is tracked-but-tolerated; `error` blocks.
