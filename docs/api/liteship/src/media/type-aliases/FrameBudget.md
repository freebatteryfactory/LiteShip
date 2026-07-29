[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/media](../README.md) / FrameBudget

# Type Alias: FrameBudget

> **FrameBudget** = `FrameBudgetShape`

Defined in: core/dist/media/frame-budget.d.ts:73

Public structural type for `FrameBudget` -- rAF-based frame budget manager with
priority lanes. Tracks remaining time per animation frame and gates work by
priority: `critical` (always runs) `> high > low > idle`. Construct one with the
standalone [createFrameBudget](../functions/createFrameBudget.md).

## Example

```ts
const budget = createFrameBudget({ targetFps: 60 });
if (budget.canRun('high')) {
  budget.scheduleSync('high', () => render());
}
const fps = budget.fpsSync; // current measured FPS
```
