[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / inputToSource

# Function: inputToSource()

> **inputToSource**(`input`): [`SignalSource`](../type-aliases/SignalSource.md) \| `undefined`

Defined in: [core/src/signal-input.ts:91](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/signal-input.ts#L91)

Parse a [SignalInput](../variables/SignalInput.md) dot-string back into its typed
[SignalSource](../type-aliases/SignalSource.md), or `undefined` when the string is not a recognized
member of the vocabulary. The inverse half of the bridge and the SINGLE
place the runtime parses an input string — `boundary.ts`, `inspector.ts`,
and `css-quantize.ts` all derive their axis from this, never a re-parse.

Bare family names (`'viewport'`, `'scroll'`, `'time'`, `'audio'`) resolve to
the family's default discriminant, matching [sourceToInput](sourceToInput.md)'s defaults.

## Parameters

### input

`string`

## Returns

[`SignalSource`](../type-aliases/SignalSource.md) \| `undefined`

## Example

```ts
inputToSource('scroll.progress'); // { type: 'scroll', axis: 'progress' }
inputToSource('viewport');        // { type: 'viewport', axis: 'width' }
inputToSource('audio.amplitude'); // { type: 'audio', mode: 'amplitude' }
inputToSource('brightness');      // undefined (not in the vocabulary)
```
