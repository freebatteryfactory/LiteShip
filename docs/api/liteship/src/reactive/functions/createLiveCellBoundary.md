[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/reactive](../README.md) / createLiveCellBoundary

# Function: createLiveCellBoundary()

> **createLiveCellBoundary**\<`I`, `S`\>(`boundary`, `initial`, `clock?`): `LiveCellShape`\<`"boundary"`, `number`\> & [`AsyncOwnedResource`](../interfaces/AsyncOwnedResource.md)

Defined in: core/dist/reactive/live-cell.d.ts:78

Create a boundary-kind LiveCell that automatically publishes crossings when the
numeric value transitions between boundary states. The live cell IS its own
disposable ([AsyncOwnedResource](../interfaces/AsyncOwnedResource.md)). `clock` (default `wallClock`) is
the injected time source for the envelope HLC and crossing timestamps — pass a
manual/fixed clock for determinism.

## Type Parameters

### I

`I` *extends* `string`

### S

`S` *extends* readonly \[`string`, `string`\]

## Parameters

### boundary

[`Boundary`](../../type-aliases/Boundary.md)\<`I`, `S`\>

### initial

`number`

### clock?

[`Clock`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/Clock.md)

## Returns

`LiveCellShape`\<`"boundary"`, `number`\> & [`AsyncOwnedResource`](../interfaces/AsyncOwnedResource.md)
