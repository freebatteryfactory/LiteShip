[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [core/src](../../README.md) / Signal

# Signal

Signal namespace -- live data feeds from the browser environment.

Create reactive signals from viewport, scroll, pointer, time, media query,
audio, or custom sources. Each signal provides `.read()` and `.subscribe(sink)`
backed by [CellKernel.replay1](../../variables/CellKernel.md#replay1), plus a [Lifetime](../../variables/Lifetime.md) for listener
cleanup. Effect-free — consumers coordinate live state with no `effect` import.

## Example

```ts
import { Signal } from '@liteship/core';

const viewport = Signal.make({ type: 'viewport', axis: 'width' });
const width = viewport.read();
const ctrl = Signal.controllable();
ctrl.seek(500);
```

## Type Aliases

- [Audio](type-aliases/Audio.md)
- [Controllable](type-aliases/Controllable.md)
