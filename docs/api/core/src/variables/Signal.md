[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Signal

# Variable: Signal

> `const` **Signal**: `object`

Defined in: [core/src/signal.ts:399](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/signal.ts#L399)

Signal namespace -- live data feeds from the browser environment.

Create reactive signals from viewport, scroll, pointer, time, media query,
audio, or custom sources. Each signal provides `.read()` and `.subscribe(sink)`
backed by [CellKernel.replay1](CellKernel.md#replay1), plus a [Lifetime](Lifetime.md) for listener
cleanup. Effect-free — consumers coordinate live state with no `effect` import.

## Type Declaration

### audio

> **audio**: (`bridge`, `mode`, `totalDurationSec?`) => `AudioSignalShape` = `_audio`

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

`AudioSignalShape`

#### Example

```ts
import { Signal } from '@czap/core';

const audioSig = Signal.audio(bridge, 'normalized', 120);
const progress = audioSig.poll(); // 0..1
```

### controllable

> **controllable**: () => `ControllableSignalShape`\<`number`\> = `_controllable`

Create a controllable time signal for video rendering / scrubbing.

External code drives the signal value via `seek()`; no automatic ticking.
`pause()`/`resume()` gate seek updates. Effect-free — `seek`/`pause`/`resume`
are synchronous.

#### Returns

`ControllableSignalShape`\<`number`\>

#### Example

```ts
import { Signal } from '@czap/core';

const ctrl = Signal.controllable();
ctrl.seek(1500);
const t = ctrl.read(); // 1500
ctrl.pause();
ctrl.seek(2000); // ignored while paused
```

### make

> **make**: (`rawSource`) => `SignalShape`\<`number`\> = `_make`

Create a reactive signal from a browser environment source.

Returns a plain signal owned by a [Lifetime](Lifetime.md): it sets up event listeners
(resize, scroll, pointermove, etc.) immediately and removes them on
`signal.lifetime.dispose()`. The signal exposes `.read()` (latest value) and
`.subscribe(sink)` (replay-1 stream of updates, returning a [Disposer](../type-aliases/Disposer.md)).

#### Parameters

##### rawSource

[`SignalSource`](../type-aliases/SignalSource.md)

#### Returns

`SignalShape`\<`number`\>

#### Example

```ts
import { Signal } from '@czap/core';

const sig = Signal.make({ type: 'viewport', axis: 'width' });
const width = sig.read(); // current window.innerWidth
const off = sig.subscribe((w) => console.log(w));
// ...
off();
await sig.lifetime.dispose();
```

## Example

```ts
import { Signal } from '@czap/core';

const viewport = Signal.make({ type: 'viewport', axis: 'width' });
const width = viewport.read();
const ctrl = Signal.controllable();
ctrl.seek(500);
```
