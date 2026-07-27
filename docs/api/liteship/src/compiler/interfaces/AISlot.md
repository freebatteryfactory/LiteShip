[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/compiler](../README.md) / AISlot

# Interface: AISlot

Defined in: compiler/dist/ai-manifest.d.ts:33

Named content slot that accepts a constrained set of content kinds.

Slots parameterize a layout — the manifest declares which content kinds
(`'image' | 'video' | ...`) each slot will accept.

## Properties

### accepts

> `readonly` **accepts**: readonly `string`[]

Defined in: compiler/dist/ai-manifest.d.ts:35

Content kinds the slot accepts.

***

### description

> `readonly` **description**: `string`

Defined in: compiler/dist/ai-manifest.d.ts:37

Human-readable description surfaced to the LLM.
