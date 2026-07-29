[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / DefineQuantizerOptions

# Interface: DefineQuantizerOptions\<B, O\>

Defined in: [\_spine/quantizer.d.ts:47](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L47)

Immutable definition options for state outputs, tier gating, and spring motion.

## Type Parameters

### B

`B` *extends* [`Boundary`](Boundary.md)

### O

`O` *extends* [`QuantizerOutputs`](QuantizerOutputs.md)\<`B`\> = [`QuantizerOutputs`](QuantizerOutputs.md)\<`B`\>

## Properties

### force?

> `readonly` `optional` **force?**: readonly [`OutputTarget`](../type-aliases/OutputTarget.md)[]

Defined in: [\_spine/quantizer.d.ts:51](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L51)

***

### outputs

> `readonly` **outputs**: `O`

Defined in: [\_spine/quantizer.d.ts:48](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L48)

***

### spring?

> `readonly` `optional` **spring?**: [`SpringConfig`](SpringConfig.md)

Defined in: [\_spine/quantizer.d.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L50)

***

### tier?

> `readonly` `optional` **tier?**: [`MotionTier`](../type-aliases/MotionTier.md)

Defined in: [\_spine/quantizer.d.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/quantizer.d.ts#L49)
