[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [core/src](../../README.md) / Zap

# Zap

Zap — push-based event channel over [CellKernel.fanout](../../variables/CellKernel.md#fanout). No-replay
fan-out with `map`, `filter`, `merge`, `debounce`, and `throttle`
combinators; every factory returns a `{ zap, lifetime }` handle.

## Example

```ts
const { zap } = Zap.make<number>();
const { zap: doubled } = Zap.map(zap, (n) => n * 2);
doubled.stream.subscribe((n) => received.push(n));
zap.emit(5); // doubled subscribers receive 10
```

## Type Aliases

- [Handle](type-aliases/Handle.md)
- [Shape](type-aliases/Shape.md)
