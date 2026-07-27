[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/media](../README.md) / UIFrame

# Interface: UIFrame

Defined in: core/dist/media/gen-frame.d.ts:31

A single frame emitted by the [GenFrame](../variables/GenFrame.md) scheduler — the unit of work
the DOM runtime consumes. Carries the drained tokens, its classification,
the quality tier that produced it, and a content-addressed receipt for
disconnect-resilient replay.

## Properties

### bufferPosition

> `readonly` **bufferPosition**: `number`

Defined in: core/dist/media/gen-frame.d.ts:38

***

### morphStrategy

> `readonly` **morphStrategy**: [`MorphStrategy`](../type-aliases/MorphStrategy.md)

Defined in: core/dist/media/gen-frame.d.ts:35

***

### qualityTier

> `readonly` **qualityTier**: [`UIQualityTier`](../../evidence/type-aliases/UIQualityTier.md)

Defined in: core/dist/media/gen-frame.d.ts:34

***

### receiptId

> `readonly` **receiptId**: [`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

Defined in: core/dist/media/gen-frame.d.ts:37

***

### timestamp

> `readonly` **timestamp**: `number`

Defined in: core/dist/media/gen-frame.d.ts:36

***

### tokens

> `readonly` **tokens**: readonly `string`[]

Defined in: core/dist/media/gen-frame.d.ts:33

***

### type

> `readonly` **type**: [`FrameType`](../type-aliases/FrameType.md)

Defined in: core/dist/media/gen-frame.d.ts:32
