[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / createFrameBudget

# Function: createFrameBudget()

> **createFrameBudget**(`config?`): `FrameBudgetShape` & [`AsyncOwnedResource`](../interfaces/AsyncOwnedResource.md)

Defined in: [core/src/media/frame-budget.ts:68](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/media/frame-budget.ts#L68)

Creates a FrameBudget tracker tied to rAF, with priority-based scheduling.
Critical tasks always run; lower priorities are deferred if budget is exhausted.
The budget IS its own disposable ([AsyncOwnedResource](../interfaces/AsyncOwnedResource.md)) — awaiting
`budget.dispose()` cancels the rAF loop (verb grammar, ADR-0046).

## Parameters

### config?

#### clock?

[`Clock`](../interfaces/Clock.md)

#### targetFps?

`number`

## Returns

`FrameBudgetShape` & [`AsyncOwnedResource`](../interfaces/AsyncOwnedResource.md)

## Example

```ts
const budget = createFrameBudget({ targetFps: 60 });
const remaining = budget.remaining(); // ms left in this frame
const canAnimate = budget.canRun('high'); // true if enough budget
const result = budget.scheduleSync('low', () => 'done');
// result is 'done' if budget permits, null otherwise
await budget.dispose(); // later: cancels the rAF loop
```
