[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / ProposalSchema

# Interface: ProposalSchema

Defined in: [core/src/ai-cast.ts:88](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L88)

The output-contract schema the [AIContext](AIContext.md) advertises. Targets share one
shape: a JSON-Schema-ish descriptor plus the [ProposalTarget](../type-aliases/ProposalTarget.md) tag that
routes a returned proposal to the matching validator. The GraphPatch schema is
the SAME `GraphPatch` the framework validates on the way back (closure).

## Properties

### description

> `readonly` **description**: `string`

Defined in: [core/src/ai-cast.ts:95](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L95)

One-line description surfaced to the model.

***

### jsonSchema

> `readonly` **jsonSchema**: `Record`\<`string`, `unknown`\>

Defined in: [core/src/ai-cast.ts:93](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L93)

JSON Schema describing the exact payload the model must return.

***

### name

> `readonly` **name**: `string`

Defined in: [core/src/ai-cast.ts:91](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L91)

Human/model-readable name of the output contract.

***

### target

> `readonly` **target**: [`ProposalTarget`](../type-aliases/ProposalTarget.md)

Defined in: [core/src/ai-cast.ts:89](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/ai-cast.ts#L89)
