[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/reactive](../README.md) / Zap

# Variable: Zap

> `const` **Zap**: `object`

Defined in: core/dist/reactive/zap.d.ts:138

Zap — push-based event channel over [CellKernel.fanout](CellKernel.md#fanout). No-replay
fan-out with `map`, `filter`, `merge`, `debounce`, and `throttle`
combinators; every factory returns the channel augmented with its own
`dispose()` ([AsyncOwnedResource](../interfaces/AsyncOwnedResource.md)).

## Type Declaration

### debounce

> **debounce**: *typeof* `_debounce`

### filter

> **filter**: *typeof* `_filter`

### fromDOMEvent

> **fromDOMEvent**: *typeof* `_fromDOMEvent`

### make

> **make**: *typeof* `_make`

### map

> **map**: *typeof* `_map`

### merge

> **merge**: *typeof* `_merge`

### throttle

> **throttle**: *typeof* `_throttle`

## Example

```ts
const zap = Zap.make<number>();
const doubled = Zap.map(zap, (n) => n * 2);
doubled.stream.subscribe((n) => received.push(n));
zap.emit(5); // doubled subscribers receive 10
await doubled.dispose();
await zap.dispose();
```
