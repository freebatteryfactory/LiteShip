[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/reactive](../README.md) / sourceToInput

# Function: sourceToInput()

> **sourceToInput**(`source`): [`SignalInput`](../../schema/type-aliases/SignalInput.md)

Defined in: core/dist/reactive/signal-input.d.ts:43

Project a [SignalSource](../type-aliases/SignalSource.md) onto its canonical [SignalInput](../../schema/variables/SignalInput.md)
dot-string. The forward half of the sanctioned bridge — the one place that
decides what string a typed source serializes to. Omitted discriminants are
treated as their documented defaults so the projection is total.

## Parameters

### source

[`SignalSource`](../type-aliases/SignalSource.md)

## Returns

[`SignalInput`](../../schema/type-aliases/SignalInput.md)

## Example

```ts
sourceToInput({ type: 'scroll', axis: 'progress' }); // 'scroll.progress'
sourceToInput({ type: 'viewport' });                 // 'viewport.width'
sourceToInput({ type: 'audio', mode: 'amplitude' }); // 'audio.amplitude'
```
