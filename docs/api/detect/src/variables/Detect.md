[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / Detect

# Variable: Detect

> `const` **Detect**: `object`

Defined in: [detect/src/detect.ts:694](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L694)

Device capability detection namespace.

Probes browser APIs for GPU tier, CPU cores, memory, input modality,
user preferences, and network info. Maps detected capabilities to
[CapLevel](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/type-aliases/CapLevel.md), [CapSet](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/interfaces/CapSet.md), [DesignTier](../type-aliases/DesignTier.md), and [MotionTier](../../../quantizer/src/type-aliases/MotionTier.md).
Supports live watching for preference and viewport changes.

You usually never call these yourself — the `@czap/astro` boundary runs
detection automatically and publishes `window.__CZAP_DETECT__` for the
runtime to read.

Advanced — direct invocation:
```ts
import { Detect } from '@czap/detect';
import { Effect } from 'effect';

const result = Effect.runSync(Detect.detect());
console.log(result.capabilities.prefersColorScheme); // 'light' | 'dark'
console.log(result.motionTier); // 'none' | 'transitions' | 'animations' | ...

// Watch for changes
const watch = Effect.scoped(
  Detect.watchCapabilities((r) => console.log('tier:', r.tier)),
);
```

## Type Declaration

### detect

> **detect**: () => `Effect`\<[`ExtendedDetectionResult`](../interfaces/ExtendedDetectionResult.md)\>

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

#### Returns

`Effect`\<[`ExtendedDetectionResult`](../interfaces/ExtendedDetectionResult.md)\>

An Effect yielding an [ExtendedDetectionResult](../interfaces/ExtendedDetectionResult.md)

### detectGPUTier

> **detectGPUTier**: () => `Effect`\<[`GPUTier`](../type-aliases/GPUTier.md)\>

Detect GPU tier from WebGL renderer string heuristics.
Falls back to tier 1 (integrated) when WebGL is unavailable.

You usually never call this yourself: the `@czap/astro` boundary runs the
same classification automatically and publishes it for the runtime to read.

Advanced — direct invocation (all probes are synchronous):
```ts
import { Detect } from '@czap/detect';
import { Effect } from 'effect';

const tier = Effect.runSync(Detect.detectGPUTier());
// tier => 0 (software) | 1 (integrated) | 2 (mid) | 3 (high-end)
```

#### Returns

`Effect`\<[`GPUTier`](../type-aliases/GPUTier.md)\>

An Effect yielding a [GPUTier](../type-aliases/GPUTier.md) (0-3)

### resetDetectionCaches

> **resetDetectionCaches**: () => `void`

Clear memoized session-stable probe results (currently the GPU renderer
string). The GPU cannot change while a page lives, so production code never
needs this — it exists for test isolation, mirroring `Diagnostics.reset`.

#### Returns

`void`

### watchCapabilities

> **watchCapabilities**: (`onChange`) => `Effect`\<`void`, `never`, [`Scope`](https://effect-ts.github.io/effect/effect/Scope.ts.html)\>

Watch for capability changes via matchMedia listeners and resize observer.
Emits a fresh DetectionResult whenever viewport, color scheme, or
reduced motion preferences change.

The stream is scoped -- listeners are cleaned up when the scope finalizes.

Event bursts are coalesced: re-detection is debounced to one sweep per
animation frame, and hardware-identity probes (GPU renderer, WebGPU, cores,
memory) are run once and reused — only viewport/DPR/media-query probes
re-run on change.

#### Parameters

##### onChange

(`result`) => `void`

Callback invoked with fresh detection results on change

#### Returns

`Effect`\<`void`, `never`, [`Scope`](https://effect-ts.github.io/effect/effect/Scope.ts.html)\>

An Effect (scoped) that sets up listeners

#### Example

```ts
import { Detect } from '@czap/detect';
import { Effect } from 'effect';

const program = Effect.scoped(
  Detect.watchCapabilities((result) => {
    console.log('Capabilities changed:', result.tier);
  }),
);
```
