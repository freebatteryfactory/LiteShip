[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / OpType

# Type Alias: OpType

> **OpType** = \{ `fn?`: `string`; `type`: `"pure"`; \} \| \{ `fn?`: `string`; `type`: `"effect"`; \} \| \{ `key`: `string`; `spec`: `Record`\<`string`, `unknown`\>; `type`: `"spawn"`; \} \| \{ `domain`: `string`; `op`: `string`; `type`: `"domain"`; \} \| \{ `condition`: `unknown`; `type`: `"choice"`; \} \| \{ `type`: `"noop"`; \}

Defined in: [\_spine/core.d.ts:1346](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L1346)

Operation kinds represented by a plan step.
