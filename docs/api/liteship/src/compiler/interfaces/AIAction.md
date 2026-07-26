[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/compiler](../README.md) / AIAction

# Interface: AIAction

Defined in: compiler/dist/ai-manifest.d.ts:45

Named action the LLM may invoke via tool calling.

`effects` is a free-form list of effect tags the host uses to route the
action's side effects (repaint, persist, etc.).

## Properties

### description

> `readonly` **description**: `string`

Defined in: compiler/dist/ai-manifest.d.ts:51

Human-readable description surfaced to the LLM.

***

### effects

> `readonly` **effects**: readonly `string`[]

Defined in: compiler/dist/ai-manifest.d.ts:49

Effect tags produced when this action runs.

***

### params

> `readonly` **params**: `Record`\<`string`, [`AIParamSchema`](AIParamSchema.md)\>

Defined in: compiler/dist/ai-manifest.d.ts:47

Parameter schemas keyed by parameter name.
