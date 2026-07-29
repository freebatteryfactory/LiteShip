[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / ResumptionStateInput

# Type Alias: ResumptionStateInput

> **ResumptionStateInput** = `Omit`\<[`ResumptionState`](../interfaces/ResumptionState.md), `"timestamp"`\> & `object`

Defined in: web/dist/types.d.ts:325

Input accepted by `Resumption.saveState`. The stored shape keeps
`timestamp` required; on input it defaults to the save clock's `now()`
(`systemClock` unless one is injected) — only the engine reads it.

## Type Declaration

### timestamp?

> `readonly` `optional` **timestamp?**: `number`
