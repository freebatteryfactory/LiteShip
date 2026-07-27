[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / sourceToInput

# Function: sourceToInput()

> **sourceToInput**(`source`): [`SignalInput`](../type-aliases/SignalInput.md)

Defined in: [core/src/reactive/signal-input.ts:54](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/reactive/signal-input.ts#L54)

Project a [SignalSource](../type-aliases/SignalSource.md) onto its canonical [SignalInput](../variables/SignalInput.md)
dot-string. The forward half of the sanctioned bridge — the one place that
decides what string a typed source serializes to. Omitted discriminants are
treated as their documented defaults so the projection is total.

## Parameters

### source

[`SignalSource`](../type-aliases/SignalSource.md)

## Returns

[`SignalInput`](../type-aliases/SignalInput.md)

## Example

```ts
sourceToInput({ type: 'scroll', axis: 'progress' }); // 'scroll.progress'
sourceToInput({ type: 'viewport' });                 // 'viewport.width'
sourceToInput({ type: 'audio', mode: 'amplitude' }); // 'audio.amplitude'
```
