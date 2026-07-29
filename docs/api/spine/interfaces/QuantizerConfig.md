[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / QuantizerConfig

# Interface: QuantizerConfig\<B, O\>

Defined in: [\_spine/quantizer.d.ts:84](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L84)

Immutable, content-addressed quantizer definition (authored intent). Pass it to
`createQuantizer` to materialize a live [LiveQuantizer](LiveQuantizer.md) paired with
the [Lifetime](../namespaces/Lifetime/README.md) that owns its teardown.

## Type Parameters

### B

`B` *extends* [`Boundary`](Boundary.md)

### O

`O` *extends* [`QuantizerOutputs`](QuantizerOutputs.md)\<`B`\> = [`QuantizerOutputs`](QuantizerOutputs.md)\<`B`\>

## Properties

### boundary

> `readonly` **boundary**: `B`

Defined in: [\_spine/quantizer.d.ts:85](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L85)

***

### force?

> `readonly` `optional` **force?**: readonly [`OutputTarget`](../type-aliases/OutputTarget.md)[]

Defined in: [\_spine/quantizer.d.ts:90](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L90)

***

### id

> `readonly` **id**: [`ContentAddress`](../type-aliases/ContentAddress.md)

Defined in: [\_spine/quantizer.d.ts:87](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L87)

***

### outputs

> `readonly` **outputs**: [`ReadonlyQuantizerValue`](../type-aliases/ReadonlyQuantizerValue.md)\<`O`\>

Defined in: [\_spine/quantizer.d.ts:86](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L86)

***

### spring?

> `readonly` `optional` **spring?**: `object`

Defined in: [\_spine/quantizer.d.ts:89](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L89)

#### damping

> `readonly` **damping**: `number`

#### mass?

> `readonly` `optional` **mass?**: `number`

#### stiffness

> `readonly` **stiffness**: `number`

***

### tier?

> `readonly` `optional` **tier?**: [`MotionTier`](../type-aliases/MotionTier.md)

Defined in: [\_spine/quantizer.d.ts:88](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L88)
