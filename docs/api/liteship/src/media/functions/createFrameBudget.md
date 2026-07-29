[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/media](../README.md) / createFrameBudget

# Function: createFrameBudget()

> **createFrameBudget**(`config?`): `FrameBudgetShape` & [`AsyncOwnedResource`](../../reactive/interfaces/AsyncOwnedResource.md)

Defined in: core/dist/media/frame-budget.d.ts:54

Creates a FrameBudget tracker tied to rAF, with priority-based scheduling.
Critical tasks always run; lower priorities are deferred if budget is exhausted.
The budget IS its own disposable ([AsyncOwnedResource](../../reactive/interfaces/AsyncOwnedResource.md)) — awaiting
`budget.dispose()` cancels the rAF loop (verb grammar).

## Parameters

### config?

#### clock?

[`Clock`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/Clock.md)

#### targetFps?

`number`

## Returns

`FrameBudgetShape` & [`AsyncOwnedResource`](../../reactive/interfaces/AsyncOwnedResource.md)

## Example

```ts
const budget = createFrameBudget({ targetFps: 60 });
const remaining = budget.remaining(); // ms left in this frame
const canAnimate = budget.canRun('high'); // true if enough budget
const result = budget.scheduleSync('low', () => 'done');
// result is 'done' if budget permits, null otherwise
await budget.dispose(); // later: cancels the rAF loop
```
