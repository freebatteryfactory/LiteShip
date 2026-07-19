[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / detectGPUTier

# Function: detectGPUTier()

> **detectGPUTier**(): [`GPUTier`](../type-aliases/GPUTier.md)

Defined in: [detect/src/detect.ts:553](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L553)

Detect GPU tier from WebGL renderer string heuristics.
Falls back to tier 1 (integrated) when WebGL is unavailable.

You usually never call this yourself: the `@liteship/astro` boundary runs the
same classification automatically and publishes it for the runtime to read.

Advanced — direct invocation (all probes are synchronous):
```ts
import { Detect } from '@liteship/detect';

const tier = Detect.detectGPUTier();
// tier => 0 (software) | 1 (integrated) | 2 (mid) | 3 (high-end)
```

## Returns

[`GPUTier`](../type-aliases/GPUTier.md)

The [GPUTier](../type-aliases/GPUTier.md) (0-3)
