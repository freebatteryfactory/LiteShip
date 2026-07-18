[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / FrameBudget

# Variable: FrameBudget

> `const` **FrameBudget**: `object`

Defined in: [core/src/frame-budget.ts:147](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/frame-budget.ts#L147)

FrameBudget -- rAF-based frame budget manager with priority lanes.
Tracks remaining time per animation frame and gates work by priority:
`critical` (always runs) `> high > low > idle`.

## Type Declaration

### make

> **make**: (`config?`) => `FrameBudgetShape` = `_make`

Creates a FrameBudget tracker tied to rAF, with priority-based scheduling.
Critical tasks always run; lower priorities are deferred if budget is exhausted.

#### Parameters

##### config?

###### clock?

[`Clock`](../interfaces/Clock.md)

###### targetFps?

`number`

#### Returns

`FrameBudgetShape`

#### Example

```ts
const budget = FrameBudget.make({ targetFps: 60 });
const remaining = budget.remaining(); // ms left in this frame
const canAnimate = budget.canRun('high'); // true if enough budget
const result = budget.scheduleSync('low', () => 'done');
// result is 'done' if budget permits, null otherwise
budget.lifetime.dispose(); // later: cancels the rAF loop
```

## Example

```ts
const budget = FrameBudget.make({ targetFps: 60 });
if (budget.canRun('high')) {
  budget.scheduleSync('high', () => render());
}
const fps = budget.fpsSync; // current measured FPS
```
