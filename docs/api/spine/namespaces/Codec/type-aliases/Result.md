[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [\_spine](../../../README.md) / [Codec](../README.md) / Result

# Type Alias: Result\<A, E\>

> **Result**\<`A`, `E`\> = \{ `ok`: `true`; `value`: `A`; \} \| \{ `error`: `E`; `ok`: `false`; \}

Defined in: [\_spine/core.d.ts:1293](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1293)

The sync tagged result a codec method returns — structurally `@liteship/error`'s
`Result<A, E>` (a success arm carrying `A`, or a failure arm carrying `E`,
discriminated by the boolean `ok`). Named structurally here rather than
imported so the spine stays install-only with zero `@liteship` runtime deps
(ADR-0010); parity with the runtime `Result` is pinned bidirectionally in
tests/unit/spine-conformance.test.ts.

## Type Parameters

### A

`A`

### E

`E`
