[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / lowerStaggerIntent

# Function: lowerStaggerIntent()

> **lowerStaggerIntent**(`intent`): [`LoweredStagger`](../interfaces/LoweredStagger.md)

Defined in: [core/src/motion/stagger.ts:135](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/stagger.ts#L135)

Lower a [StaggerIntent](../interfaces/StaggerIntent.md) into parallel TransitionNodes sharing one signal.

Each child gets `routing: 'par'` and the same `durationMs`; stagger offset is
applied at compile time as `animation-delay` / `transition-delay`.

## Parameters

### intent

[`StaggerIntent`](../interfaces/StaggerIntent.md)

## Returns

[`LoweredStagger`](../interfaces/LoweredStagger.md)
