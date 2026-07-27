[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/reactive](../README.md) / Signal

# Variable: Signal

> `const` **Signal**: `object`

Defined in: core/dist/reactive/signal.d.ts:185

Signal namespace -- the alternate live-feed constructors.

The primary environment-source constructor is the standalone [createSignal](../functions/createSignal.md)
(verb grammar, ADR-0046 — `create` allocates a runtime resource). This namespace
carries the two SPECIALIZED constructors: `controllable` (a seekable/pausable
time signal driven externally) and `audio` (an [AVBridge](../../media/variables/AVBridge.md)-backed sample/
normalized feed). Each signal provides `.read()` and `.subscribe(sink)` backed by
[CellKernel.replay1](CellKernel.md#replay1), and IS its own disposable ([AsyncOwnedResource](../interfaces/AsyncOwnedResource.md)).

## Type Declaration

### audio

> **audio**: *typeof* `_audio`

### controllable

> **controllable**: *typeof* `_controllable`

## Example

```ts
import { createSignal, Signal } from '@liteship/core';

const viewport = createSignal({ type: 'viewport', axis: 'width' });
const width = viewport.read();
const ctrl = Signal.controllable();
ctrl.seek(500);
```
