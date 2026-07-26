[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/motion](../README.md) / lowerStaggerIntent

# Function: lowerStaggerIntent()

> **lowerStaggerIntent**(`intent`): [`LoweredStagger`](../interfaces/LoweredStagger.md)

Defined in: core/dist/motion/stagger.d.ts:53

Lower a [StaggerIntent](../interfaces/StaggerIntent.md) into parallel TransitionNodes sharing one signal.

Each child gets `routing: 'par'` and the same `durationMs`; stagger offset is
applied at compile time as `animation-delay` / `transition-delay`.

## Parameters

### intent

[`StaggerIntent`](../interfaces/StaggerIntent.md)

## Returns

[`LoweredStagger`](../interfaces/LoweredStagger.md)
