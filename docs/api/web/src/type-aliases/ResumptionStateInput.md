[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / ResumptionStateInput

# Type Alias: ResumptionStateInput

> **ResumptionStateInput** = `Omit`\<[`ResumptionState`](../interfaces/ResumptionState.md), `"timestamp"`\> & `object`

Defined in: [web/src/types.ts:355](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L355)

Input accepted by `Resumption.saveState`. The stored shape keeps
`timestamp` required; on input it defaults to the save clock's `now()`
(`systemClock` unless one is injected) — only the engine reads it.

## Type Declaration

### timestamp?

> `readonly` `optional` **timestamp?**: `number`
