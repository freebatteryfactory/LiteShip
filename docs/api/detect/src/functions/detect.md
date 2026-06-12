[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / detect

# Function: detect()

> **detect**(): `Effect`\<[`ExtendedDetectionResult`](../interfaces/ExtendedDetectionResult.md)\>

Defined in: [detect/src/detect.ts:663](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L663)

Run a full device capability detection sweep.
All probes are synchronous with internal error handling -- gracefully
falls back to conservative defaults when APIs are unavailable.

You usually never call this yourself: in an Astro project the `@czap/astro`
boundary runs detection after DOMContentLoaded and publishes the result as
`window.__CZAP_DETECT__`, so satellites and the directive runtime read it
for free.

Advanced — direct invocation (there is no async work, so `runSync` is the
right executor):
```ts
import { Detect } from '@czap/detect';
import { Effect } from 'effect';

const result = Effect.runSync(Detect.detect());
console.log(result.capabilities.gpu);       // 0-3
console.log(result.tier);                   // 'static' | 'styled' | 'reactive' | 'animated' | 'gpu'
console.log(result.designTier);             // 'minimal' | 'standard' | 'enhanced' | 'rich'
console.log(result.motionTier);             // 'none' | 'transitions' | ...
console.log(result.confidence);             // 0.5 - 1.0
```

## Returns

`Effect`\<[`ExtendedDetectionResult`](../interfaces/ExtendedDetectionResult.md)\>

An Effect yielding an [ExtendedDetectionResult](../interfaces/ExtendedDetectionResult.md)
