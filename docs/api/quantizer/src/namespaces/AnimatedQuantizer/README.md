[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [quantizer/src](../../README.md) / AnimatedQuantizer

# AnimatedQuantizer

Animated quantizer namespace.

Wraps a reactive quantizer with transition-aware interpolation. When a
boundary crossing occurs, numeric output values are lerped over a configurable
duration and easing curve. Non-numeric values snap at the 50% mark.
The `interpolated` fan-out publishes frames containing progress (0-1) and
the current interpolated output record.

## Example

```ts
import { Boundary, Millis } from '@liteship/core';
import { Q, AnimatedQuantizer } from '@liteship/quantizer';

const boundary = Boundary.make({
  input: 'scroll',
  at: [[0, 'top'], [500, 'bottom']],
});
const config = Q.from(boundary).outputs({});
const { quantizer: live } = config.create();
const { animated, lifetime } = AnimatedQuantizer.make(live, { '*': { duration: Millis(200) } });
animated.transition; // TransitionResolver
await lifetime.dispose();
```

## Type Aliases

- [Shape](type-aliases/Shape.md)
