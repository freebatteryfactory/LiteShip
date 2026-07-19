[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [core/src](../../README.md) / HLC

# HLC

HLC namespace -- Hybrid Logical Clock.

Pure functions for creating, comparing, incrementing, and merging HLC
timestamps, plus a plain (Effect-free) managed-clock factory
([makeClock](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/hlc.ts) → an [HLCClock](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/hlc.ts) handle with `tick`/`receive`/`current`).
Encodes to/from a deterministic colon-separated hex string format.

## Example

```ts
import { HLC } from '@liteship/core';

const a = HLC.increment(HLC.create('A'), Date.now());
const b = HLC.increment(HLC.create('B'), Date.now());
const merged = HLC.merge(a, b, Date.now());
const encoded = HLC.encode(merged);
const decoded = HLC.decode(encoded);

const clock = HLC.makeClock('A'); // reads wallClock by default
const ts = clock.tick();
```

## Type Aliases

- [Clock](type-aliases/Clock.md)
- [Shape](type-aliases/Shape.md)
