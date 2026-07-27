[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [core/src](../../README.md) / Signal

# Signal

Signal namespace -- the alternate live-feed constructors.

The primary environment-source constructor is the standalone [createSignal](../../functions/createSignal.md)
(verb grammar, ADR-0046 — `create` allocates a runtime resource). This namespace
carries the two SPECIALIZED constructors: `controllable` (a seekable/pausable
time signal driven externally) and `audio` (an [AVBridge](../../variables/AVBridge.md)-backed sample/
normalized feed). Each signal provides `.read()` and `.subscribe(sink)` backed by
[CellKernel.replay1](../../variables/CellKernel.md#replay1), and IS its own disposable ([AsyncOwnedResource](../../interfaces/AsyncOwnedResource.md)).

## Example

```ts
import { createSignal, Signal } from '@liteship/core';

const viewport = createSignal({ type: 'viewport', axis: 'width' });
const width = viewport.read();
const ctrl = Signal.controllable();
ctrl.seek(500);
```

## Type Aliases

- [Audio](type-aliases/Audio.md)
- [Controllable](type-aliases/Controllable.md)
