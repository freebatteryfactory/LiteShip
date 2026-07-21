[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / createLiveCellBoundary

# Function: createLiveCellBoundary()

> **createLiveCellBoundary**\<`I`, `S`\>(`boundary`, `initial`, `clock?`): `LiveCellShape`\<`"boundary"`, `number`\> & [`AsyncOwnedResource`](../interfaces/AsyncOwnedResource.md)

Defined in: [core/src/reactive/live-cell.ts:215](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/live-cell.ts#L215)

Create a boundary-kind LiveCell that automatically publishes crossings when the
numeric value transitions between boundary states. The live cell IS its own
disposable ([AsyncOwnedResource](../interfaces/AsyncOwnedResource.md)). `clock` (default [wallClock](../variables/wallClock.md)) is
the injected time source for the envelope HLC and crossing timestamps — pass a
manual/fixed clock for determinism.

## Type Parameters

### I

`I` *extends* `string`

### S

`S` *extends* readonly \[`string`, `string`\]

## Parameters

### boundary

[`Boundary`](../type-aliases/Boundary.md)\<`I`, `S`\>

### initial

`number`

### clock?

[`Clock`](../interfaces/Clock.md) = `wallClock`

## Returns

`LiveCellShape`\<`"boundary"`, `number`\> & [`AsyncOwnedResource`](../interfaces/AsyncOwnedResource.md)
