[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [core/src](../README.md) / lowerRevealIntent

# Function: lowerRevealIntent()

> **lowerRevealIntent**(`intent`): [`LoweredReveal`](../interfaces/LoweredReveal.md)

Defined in: [core/src/motion/reveal.ts:282](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/motion/reveal.ts#L282)

Lower a [RevealIntent](../interfaces/RevealIntent.md) into real DocumentGraph node families:
Signal → Entity → Component → Pose×2 → Transition → Policy → Projection.

## Parameters

### intent

[`RevealIntent`](../interfaces/RevealIntent.md)

## Returns

[`LoweredReveal`](../interfaces/LoweredReveal.md)
