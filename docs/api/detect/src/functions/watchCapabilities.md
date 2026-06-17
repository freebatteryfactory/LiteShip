[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [detect/src](../README.md) / watchCapabilities

# Function: watchCapabilities()

> **watchCapabilities**(`onChange`): `Effect`\<`void`, `never`, [`Scope`](https://effect-ts.github.io/effect/effect/Scope.ts.html)\>

Defined in: [detect/src/detect.ts:738](https://github.com/heyoub/LiteShip/blob/main/packages/detect/src/detect.ts#L738)

Watch for capability changes via matchMedia listeners and resize observer.
Emits a fresh DetectionResult whenever viewport, color scheme, or
reduced motion preferences change.

The stream is scoped -- listeners are cleaned up when the scope finalizes.

Event bursts are coalesced: re-detection is debounced to one sweep per
animation frame, and hardware-identity probes (GPU renderer, WebGPU, cores,
memory) are run once and reused — only viewport/DPR/media-query probes
re-run on change.

## Parameters

### onChange

(`result`) => `void`

Callback invoked with fresh detection results on change

## Returns

`Effect`\<`void`, `never`, [`Scope`](https://effect-ts.github.io/effect/effect/Scope.ts.html)\>

An Effect (scoped) that sets up listeners

## Example

```ts
import { Detect } from '@czap/detect';
import { Effect } from 'effect';

const program = Effect.scoped(
  Detect.watchCapabilities((result) => {
    console.log('Capabilities changed:', result.tier);
  }),
);
```
