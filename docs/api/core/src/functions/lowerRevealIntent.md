[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / lowerRevealIntent

# Function: lowerRevealIntent()

> **lowerRevealIntent**(`intent`): [`LoweredReveal`](../interfaces/LoweredReveal.md)

Defined in: [core/src/reveal.ts:194](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reveal.ts#L194)

Lower a [RevealIntent](../interfaces/RevealIntent.md) into real DocumentGraph node families:
Signal → Entity → Component → Pose×2 → Transition → Policy → Projection.

## Parameters

### intent

[`RevealIntent`](../interfaces/RevealIntent.md)

## Returns

[`LoweredReveal`](../interfaces/LoweredReveal.md)
