[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / Zap

# Variable: Zap

> `const` **Zap**: `object`

Defined in: [core/src/reactive/zap.ts:233](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/zap.ts#L233)

Zap — push-based event channel over [CellKernel.fanout](CellKernel.md#fanout). No-replay
fan-out with `map`, `filter`, `merge`, `debounce`, and `throttle`
combinators; every factory returns the channel augmented with its own
`dispose()` ([AsyncOwnedResource](../interfaces/AsyncOwnedResource.md)).

## Type Declaration

### debounce

> **debounce**: \<`T`\>(`event`, `ms`) => `OwnedZap`\<`T`\> = `_debounce`

Debounces a Zap, only emitting after `ms` milliseconds of silence.

The pending timer is cancelled on each new source value (so only the trailing
value survives) and gated by the owning Lifetime's [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal): a
timer that fires after dispose does not publish.

#### Type Parameters

##### T

`T`

#### Parameters

##### event

`ZapShape`\<`T`\>

##### ms

`Millis`

#### Returns

`OwnedZap`\<`T`\>

#### Example

```ts
const debounced = Zap.debounce(input, Millis(300));
// debounced.stream emits only after a 300ms pause in input
```

### filter

> **filter**: \<`T`\>(`event`, `predicate`) => `OwnedZap`\<`T`\> = `_filter`

Filters a Zap, only forwarding values that satisfy the predicate.

#### Type Parameters

##### T

`T`

#### Parameters

##### event

`ZapShape`\<`T`\>

##### predicate

(`value`) => `boolean`

#### Returns

`OwnedZap`\<`T`\>

#### Example

```ts
const evens = Zap.filter(nums, (n) => n % 2 === 0);
// evens.stream only receives even numbers
```

### fromDOMEvent

> **fromDOMEvent**: \<`K`\>(`element`, `event`) => `OwnedZap`\<`HTMLElementEventMap`\[`K`\]\> = `_fromDOMEvent`

Creates a Zap from a DOM event; the listener is owned by the returned
[Lifetime](Lifetime.md) and removed on dispose.

#### Type Parameters

##### K

`K` *extends* keyof `HTMLElementEventMap`

#### Parameters

##### element

`HTMLElement`

##### event

`K`

#### Returns

`OwnedZap`\<`HTMLElementEventMap`\[`K`\]\>

#### Example

```ts
const btn = document.getElementById('btn')!;
const clicks = Zap.fromDOMEvent(btn, 'click');
// clicks.stream emits MouseEvents; await clicks.dispose() removes the listener
```

### make

> **make**: \<`T`\>() => `OwnedZap`\<`T`\> = `_make`

Creates a new push-based event channel backed by a no-replay fan-out.

#### Type Parameters

##### T

`T`

#### Returns

`OwnedZap`\<`T`\>

#### Example

```ts
const zap = Zap.make<number>();
zap.stream.subscribe((n) => received.push(n));
zap.emit(42); // subscribers receive 42
await zap.dispose();
```

### map

> **map**: \<`A`, `B`\>(`event`, `f`) => `OwnedZap`\<`B`\> = `_map`

Transforms each value emitted by a Zap through a mapping function.

#### Type Parameters

##### A

`A`

##### B

`B`

#### Parameters

##### event

`ZapShape`\<`A`\>

##### f

(`a`) => `B`

#### Returns

`OwnedZap`\<`B`\>

#### Example

```ts
const strs = Zap.map(nums, (n) => `value: ${n}`);
// strs.stream emits transformed strings
```

### merge

> **merge**: \<`T`\>(`events`) => `OwnedZap`\<`T`\> = `_merge`

Merges multiple Zaps of the same type into a single Zap.

#### Type Parameters

##### T

`T`

#### Parameters

##### events

readonly `ZapShape`\<`T`\>[]

#### Returns

`OwnedZap`\<`T`\>

#### Example

```ts
const merged = Zap.merge([a, b]);
// merged.stream receives events from both a and b
```

### throttle

> **throttle**: \<`T`\>(`event`, `ms`, `clock`) => `OwnedZap`\<`T`\> = `_throttle`

Throttles a Zap, allowing at most one emission per `ms` milliseconds. The
window is measured through the injected [Clock](../interfaces/Clock.md) (defaulting to
[systemClock](systemClock.md), the monotonic `performance.now` boundary) so the throttle
is replayable without an ambient time read.

#### Type Parameters

##### T

`T`

#### Parameters

##### event

`ZapShape`\<`T`\>

##### ms

`Millis`

##### clock?

[`Clock`](../interfaces/Clock.md) = `systemClock`

#### Returns

`OwnedZap`\<`T`\>

#### Example

```ts
const throttled = Zap.throttle(scroll, Millis(16));
// throttled.stream emits at most once every 16ms (~60fps)
```

## Example

```ts
const zap = Zap.make<number>();
const doubled = Zap.map(zap, (n) => n * 2);
doubled.stream.subscribe((n) => received.push(n));
zap.emit(5); // doubled subscribers receive 10
await doubled.dispose();
await zap.dispose();
```
