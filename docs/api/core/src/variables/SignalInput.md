[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / SignalInput

# Variable: SignalInput

> **SignalInput**: \<`I`\>(`value`) => [`SignalInput`](../type-aliases/SignalInput.md)\<`I`\>

Defined in: [core/src/brands.ts:30](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/brands.ts#L30)

Wrap a plain string as a SignalInput.

The brand is DELIBERATELY lenient free-form (see `signal-input.ts`): real
values include colon payloads carrying spaces and parens, e.g.
`media:(min-width: 600px)` and `custom:my.signal.id`, so any
character-grammar would reject genuine inputs. The one real invariant is
that a signal must NAME something — the empty string addresses no signal.

## Type Parameters

### I

`I` *extends* `string`

## Parameters

### value

`I`

## Returns

[`SignalInput`](../type-aliases/SignalInput.md)\<`I`\>

## Throws

ValidationError when `value` is the empty string.
