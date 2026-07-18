[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / Detect

# Variable: Detect

> `const` **Detect**: `object`

Defined in: [detect/src/detect.ts:654](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L654)

Device capability detection namespace.

Probes browser APIs for GPU tier, CPU cores, memory, input modality,
user preferences, and network info. Maps detected capabilities to
[CapTier](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/type-aliases/CapTier.md), [CapSet](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/CapSet.md), [DesignTier](../type-aliases/DesignTier.md), and [MotionTier](../../../quantizer/src/type-aliases/MotionTier.md).
Supports live watching for preference and viewport changes.

You usually never call these yourself — the `@czap/astro` boundary runs
detection automatically and publishes `window.__CZAP_DETECT__` for the
runtime to read.

Advanced — direct invocation:
```ts
import { Detect } from '@czap/detect';

const result = Detect.detect();
console.log(result.capabilities.prefersColorScheme); // 'light' | 'dark'
console.log(result.motionTier); // 'none' | 'transitions' | 'animations' | ...

// Watch for changes
const dispose = Detect.watchCapabilities((r) => console.log('capTier:', r.capTier));
// later: dispose()
```

## Type Declaration

### detect

> **detect**: () => [`ExtendedDetectionResult`](../interfaces/ExtendedDetectionResult.md)

Run a full device capability detection sweep.
All probes are synchronous with internal error handling -- gracefully
falls back to conservative defaults when APIs are unavailable.

You usually never call this yourself: in an Astro project the `@czap/astro`
boundary runs detection after DOMContentLoaded and publishes the result as
`window.__CZAP_DETECT__`, so satellites and the directive runtime read it
for free.

Advanced — direct invocation (all probes are synchronous):
```ts
import { Detect } from '@czap/detect';

const result = Detect.detect();
console.log(result.capabilities.gpu);       // 0-3
console.log(result.capTier);                   // 'static' | 'styled' | 'reactive' | 'animated' | 'gpu'
console.log(result.designTier);             // 'minimal' | 'standard' | 'enhanced' | 'rich'
console.log(result.motionTier);             // 'none' | 'transitions' | ...
console.log(result.confidence);             // 0.5 - 1.0
```

#### Returns

[`ExtendedDetectionResult`](../interfaces/ExtendedDetectionResult.md)

The [ExtendedDetectionResult](../interfaces/ExtendedDetectionResult.md)

### detectGPUTier

> **detectGPUTier**: () => [`GPUTier`](../type-aliases/GPUTier.md)

Detect GPU tier from WebGL renderer string heuristics.
Falls back to tier 1 (integrated) when WebGL is unavailable.

You usually never call this yourself: the `@czap/astro` boundary runs the
same classification automatically and publishes it for the runtime to read.

Advanced — direct invocation (all probes are synchronous):
```ts
import { Detect } from '@czap/detect';

const tier = Detect.detectGPUTier();
// tier => 0 (software) | 1 (integrated) | 2 (mid) | 3 (high-end)
```

#### Returns

[`GPUTier`](../type-aliases/GPUTier.md)

The [GPUTier](../type-aliases/GPUTier.md) (0-3)

### resetDetectionCaches

> **resetDetectionCaches**: () => `void`

Clear memoized session-stable probe results (currently the GPU renderer
string). The GPU cannot change while a page lives, so production code never
needs this — it exists for test isolation, mirroring `Diagnostics.reset`.

#### Returns

`void`

### watchCapabilities

> **watchCapabilities**: (`onChange`) => [`Disposer`](../type-aliases/Disposer.md)

Watch for capability changes via matchMedia listeners and resize observer.
Emits a fresh DetectionResult whenever viewport, color scheme, or
reduced motion preferences change.

Listeners are torn down when the returned [Disposer](../type-aliases/Disposer.md) is called.

Event bursts are coalesced: re-detection is debounced to one sweep per
animation frame, and hardware-identity probes (GPU renderer, WebGPU, cores,
memory) are run once and reused — only viewport/DPR/media-query probes
re-run on change.

#### Parameters

##### onChange

(`result`) => `void`

Callback invoked with fresh detection results on change

#### Returns

[`Disposer`](../type-aliases/Disposer.md)

A [Disposer](../type-aliases/Disposer.md) that removes the listeners it added

#### Example

```ts
import { Detect } from '@czap/detect';

const dispose = Detect.watchCapabilities((result) => {
  console.log('Capabilities changed:', result.capTier);
});
// later: dispose()
```
