[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/astro](../README.md) / QuantizeProps

# Interface: QuantizeProps\<B\>

Defined in: astro/dist/quantize.d.ts:27

Props accepted by the `Quantize` Astro component and by
[resolveInitialState](../functions/resolveInitialState.md).

## Type Parameters

### B

`B` *extends* [`Boundary`](../../type-aliases/Boundary.md) = [`Boundary`](../../type-aliases/Boundary.md)

## Properties

### boundary

> `readonly` **boundary**: `B`

Defined in: astro/dist/quantize.d.ts:29

Boundary to quantize.

***

### class?

> `readonly` `optional` **class?**: `string`

Defined in: astro/dist/quantize.d.ts:37

Extra CSS class names.

***

### fallback?

> `readonly` `optional` **fallback?**: `string`

Defined in: astro/dist/quantize.d.ts:35

Final fallback if resolution fails.

***

### initialState?

> `readonly` `optional` **initialState?**: `string`

Defined in: astro/dist/quantize.d.ts:33

Explicit initial state (skips resolution).

***

### quantizer?

> `readonly` `optional` **quantizer?**: [`Quantizer`](../../interfaces/Quantizer.md)\<`B`\>

Defined in: astro/dist/quantize.d.ts:31

Optional explicit quantizer definition.
