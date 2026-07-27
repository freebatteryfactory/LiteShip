[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / GateSubjectCoverage

# Type Alias: GateSubjectCoverage

> **GateSubjectCoverage** = \{ `censusDigest`: `` `sha256:${string}` ``; `enumeratedCount`: `number`; `enumerator`: `string`; `status`: `"complete"`; \} \| \{ `censusDigest`: `` `sha256:${string}` ``; `enumeratedCount`: `number`; `enumerator`: `string`; `reason`: `string`; `status`: `"opaque"`; \}

Defined in: [gauntlet/src/gate.ts:451](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/gate.ts#L451)

A gate's current-head account of the discrete subjects it claims to govern.

This is deliberately a receipt, not a historical score. A gate either names
the complete population it judged or reports why that population is opaque.
Gates that are predicates over their entire covered corpus rather than a
discrete subject registry omit the resolver entirely; the authority layer
records that distinction as `not-applicable`.
