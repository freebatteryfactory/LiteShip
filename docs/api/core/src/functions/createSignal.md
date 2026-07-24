[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / createSignal

# Function: createSignal()

> **createSignal**(`rawSource`, `clock?`): `SignalShape`\<`number`\> & [`AsyncOwnedResource`](../interfaces/AsyncOwnedResource.md)

Defined in: [core/src/reactive/signal.ts:276](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/signal.ts#L276)

Create a reactive signal from a browser environment source.

Returns a signal that IS its own disposable ([AsyncOwnedResource](../interfaces/AsyncOwnedResource.md)): it sets
up event listeners (resize, scroll, pointermove, etc.) immediately and removes
them on `signal.dispose()` (or `await using signal = createSignal(...)`). The
signal exposes `.read()` (latest value) and `.subscribe(sink)` (replay-1 stream
of updates, returning a [Disposer](../type-aliases/Disposer.md)); the owning [Lifetime](../variables/Lifetime.md) stays
reachable as `signal.lifetime` for advanced composition.

`clock` (default [wallClock](../variables/wallClock.md)) is the injected time source for the `time`
source family (elapsed/absolute) — pass a `manualClock`/`fixedClock` to drive an
elapsed/absolute signal deterministically without touching the ambient clock.

## Parameters

### rawSource

[`SignalSource`](../type-aliases/SignalSource.md)

### clock?

[`Clock`](../interfaces/Clock.md) = `wallClock`

## Returns

`SignalShape`\<`number`\> & [`AsyncOwnedResource`](../interfaces/AsyncOwnedResource.md)

## Example

```ts
import { createSignal } from '@liteship/core';

const sig = createSignal({ type: 'viewport', axis: 'width' });
const width = sig.read(); // current window.innerWidth
const off = sig.subscribe((w) => console.log(w));
// ...
off();
await sig.dispose();
```
