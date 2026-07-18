[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [core/src](../../README.md) / FrameBudget

# FrameBudget

FrameBudget -- rAF-based frame budget manager with priority lanes.
Tracks remaining time per animation frame and gates work by priority:
`critical` (always runs) `> high > low > idle`.

## Example

```ts
const budget = FrameBudget.make({ targetFps: 60 });
if (budget.canRun('high')) {
  budget.scheduleSync('high', () => render());
}
const fps = budget.fpsSync; // current measured FPS
```

## Type Aliases

- [Shape](type-aliases/Shape.md)
