[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/compiler](../README.md) / AIDimension

# Interface: AIDimension

Defined in: compiler/dist/ai-manifest.d.ts:17

Named dimension of UI state (e.g. `theme`, `layout`, `density`).

`exclusive: true` means exactly one state is active at a time (a radio
group); `exclusive: false` allows multiple concurrent states (a flag set).

## Properties

### current

> `readonly` **current**: `string`

Defined in: compiler/dist/ai-manifest.d.ts:21

Currently-active state (must be in `states`).

***

### description

> `readonly` **description**: `string`

Defined in: compiler/dist/ai-manifest.d.ts:25

Human-readable description surfaced to the LLM.

***

### exclusive

> `readonly` **exclusive**: `boolean`

Defined in: compiler/dist/ai-manifest.d.ts:23

Whether only one state can be active at a time.

***

### states

> `readonly` **states**: readonly `string`[]

Defined in: compiler/dist/ai-manifest.d.ts:19

Allowed state names.
