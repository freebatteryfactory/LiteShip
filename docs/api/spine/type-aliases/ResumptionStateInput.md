[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / ResumptionStateInput

# Type Alias: ResumptionStateInput

> **ResumptionStateInput** = `Omit`\<[`ResumptionState`](../interfaces/ResumptionState.md), `"timestamp"`\> & `object`

Defined in: [\_spine/web.d.ts:352](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L352)

Input accepted by `Resumption.saveState`. The stored shape keeps
`timestamp` required; on input it defaults to `Date.now()` — only the
engine reads it.

## Type Declaration

### timestamp?

> `readonly` `optional` **timestamp?**: `number`
