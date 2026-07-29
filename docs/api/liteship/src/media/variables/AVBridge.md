[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/media](../README.md) / AVBridge

# Variable: AVBridge

> `const` **AVBridge**: `object`

Defined in: core/dist/media/av-bridge.d.ts:64

AVBridge -- SharedArrayBuffer-based timeline bridge for audio/video convergence.
Provides atomic sample counting shared between AudioWorklet and visual compositor.

## Type Declaration

### make

> **make**: *typeof* `_make`

## Example

```ts
const bridge = AVBridge.make({ sampleRate: 44100, fps: 30 });
bridge.setRunning(true);
bridge.advanceSamples(1470); // advance by one video frame worth of samples
bridge.getCurrentFrame(); // 1
bridge.sampleToTime(44100); // 1.0 (seconds)
bridge.timeToSample(0.5);   // 22050
```
