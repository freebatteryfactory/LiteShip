[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / detect

# Function: detect()

> **detect**(): [`ExtendedDetectionResult`](../interfaces/ExtendedDetectionResult.md)

Defined in: [detect/src/detect.ts:625](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L625)

Run a full device capability detection sweep.
All probes are synchronous with internal error handling -- gracefully
falls back to conservative defaults when APIs are unavailable.

You usually never call this yourself: in an Astro project the `@liteship/astro`
boundary runs detection after DOMContentLoaded and publishes the result as
`window.__LITESHIP_DETECT__`, so adaptives and the directive runtime read it
for free.

Advanced — direct invocation (all probes are synchronous):
```ts
import { Detect } from '@liteship/detect';

const result = Detect.detect();
console.log(result.capabilities.gpu);       // 0-3
console.log(result.capTier);                   // 'static' | 'styled' | 'reactive' | 'animated' | 'gpu'
console.log(result.designTier);             // 'minimal' | 'standard' | 'enhanced' | 'rich'
console.log(result.motionTier);             // 'none' | 'transitions' | ...
console.log(result.confidence);             // 0.5 - 1.0
```

## Returns

[`ExtendedDetectionResult`](../interfaces/ExtendedDetectionResult.md)

The [ExtendedDetectionResult](../interfaces/ExtendedDetectionResult.md)
