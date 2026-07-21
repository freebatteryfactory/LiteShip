[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Signal

# Variable: Signal

> `const` **Signal**: `object`

Defined in: [core/src/reactive/signal.ts:430](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/signal.ts#L430)

Signal namespace -- the alternate live-feed constructors.

The primary environment-source constructor is the standalone [createSignal](../functions/createSignal.md)
(verb grammar, ADR-0046 — `create` allocates a runtime resource). This namespace
carries the two SPECIALIZED constructors: `controllable` (a seekable/pausable
time signal driven externally) and `audio` (an [AVBridge](AVBridge.md)-backed sample/
normalized feed). Each signal provides `.read()` and `.subscribe(sink)` backed by
[CellKernel.replay1](CellKernel.md#replay1), and IS its own disposable ([AsyncOwnedResource](../interfaces/AsyncOwnedResource.md)).

## Type Declaration

### audio

> **audio**: (`bridge`, `mode`, `totalDurationSec?`) => `AudioSignalShape` & [`AsyncOwnedResource`](../interfaces/AsyncOwnedResource.md) = `_audio`

Create an audio signal backed by an AVBridge.

In 'sample' mode, returns the raw sample index. In 'normalized' mode,
returns a 0..1 progress value based on totalDurationSec — omitting
`totalDurationSec` (or passing a non-positive value) in 'normalized'
mode throws a `ValidationError` SYNCHRONOUSLY at construction (the eager-throw
fault edge, preserved verbatim). Call `.poll()` to read the latest sample from
the bridge and update the signal.

#### Parameters

##### bridge

`AVBridgeShape`

##### mode?

`"sample"` \| `"normalized"`

##### totalDurationSec?

`number`

#### Returns

`AudioSignalShape` & [`AsyncOwnedResource`](../interfaces/AsyncOwnedResource.md)

#### Example

```ts
import { Signal } from '@liteship/core';

const audioSig = Signal.audio(bridge, 'normalized', 120);
const progress = audioSig.poll(); // 0..1
```

### controllable

> **controllable**: () => `ControllableSignalShape`\<`number`\> & [`AsyncOwnedResource`](../interfaces/AsyncOwnedResource.md) = `_controllable`

Create a controllable time signal for video rendering / scrubbing.

External code drives the signal value via `seek()`; no automatic ticking.
`pause()`/`resume()` gate seek updates. Effect-free — `seek`/`pause`/`resume`
are synchronous. The controllable signal IS its own disposable
([AsyncOwnedResource](../interfaces/AsyncOwnedResource.md)): `await ctrl.dispose()` closes the kernel.

#### Returns

`ControllableSignalShape`\<`number`\> & [`AsyncOwnedResource`](../interfaces/AsyncOwnedResource.md)

#### Example

```ts
import { Signal } from '@liteship/core';

const ctrl = Signal.controllable();
ctrl.seek(1500);
const t = ctrl.read(); // 1500
ctrl.pause();
ctrl.seek(2000); // ignored while paused
```

## Example

```ts
import { createSignal, Signal } from '@liteship/core';

const viewport = createSignal({ type: 'viewport', axis: 'width' });
const width = viewport.read();
const ctrl = Signal.controllable();
ctrl.seek(500);
```
