[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / watchCapabilities

# Function: watchCapabilities()

> **watchCapabilities**(`onChange`): [`Disposer`](../type-aliases/Disposer.md)

Defined in: [detect/src/detect.ts:686](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/detect.ts#L686)

Watch for capability changes via matchMedia listeners and resize observer.
Emits a fresh DetectionResult whenever viewport, color scheme, or
reduced motion preferences change.

Listeners are torn down when the returned [Disposer](../type-aliases/Disposer.md) is called.

Event bursts are coalesced: re-detection is debounced to one sweep per
animation frame, and hardware-identity probes (GPU renderer, WebGPU, cores,
memory) are run once and reused — only viewport/DPR/media-query probes
re-run on change.

## Parameters

### onChange

(`result`) => `void`

Callback invoked with fresh detection results on change

## Returns

[`Disposer`](../type-aliases/Disposer.md)

A [Disposer](../type-aliases/Disposer.md) that removes the listeners it added

## Example

```ts
import { Detect } from '@liteship/detect';

const dispose = Detect.watchCapabilities((result) => {
  console.log('Capabilities changed:', result.capTier);
});
// later: dispose()
```
