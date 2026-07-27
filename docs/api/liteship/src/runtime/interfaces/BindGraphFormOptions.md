[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / BindGraphFormOptions

# Interface: BindGraphFormOptions

Defined in: web/dist/graph-form.d.ts:13

Wiring for [bindGraphForm](../functions/bindGraphForm.md): the channel client, the host's ops projection, and an optional outcome hook.

## Properties

### client

> `readonly` **client**: [`GraphMutationClient`](../../graph/interfaces/GraphMutationClient.md)

Defined in: web/dist/graph-form.d.ts:14

***

### onOutcome?

> `readonly` `optional` **onOutcome?**: (`response`) => `void`

Defined in: web/dist/graph-form.d.ts:18

Optional imperative hook; the `liteship:mutation` event fires regardless.

#### Parameters

##### response

[`GraphMutationResponse`](../../graph/type-aliases/GraphMutationResponse.md)

#### Returns

`void`

***

### toOps

> `readonly` **toOps**: (`data`, `base`) => readonly [`PatchOp`](../../graph/type-aliases/PatchOp.md)[]

Defined in: web/dist/graph-form.d.ts:16

Project the submitted form into patch ops. Host-owned domain logic (nodes must be sealed by the host via sealNode).

#### Parameters

##### data

`FormData`

##### base

[`DocumentGraph`](../../graph/interfaces/DocumentGraph.md)

#### Returns

readonly [`PatchOp`](../../graph/type-aliases/PatchOp.md)[]
