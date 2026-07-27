[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / BindGraphFormOptions

# Interface: BindGraphFormOptions

Defined in: [web/src/graph-form.ts:17](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/graph-form.ts#L17)

Wiring for [bindGraphForm](../functions/bindGraphForm.md): the channel client, the host's ops projection, and an optional outcome hook.

## Properties

### client

> `readonly` **client**: [`GraphMutationClient`](../../../liteship/src/graph/interfaces/GraphMutationClient.md)

Defined in: [web/src/graph-form.ts:18](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/graph-form.ts#L18)

***

### onOutcome?

> `readonly` `optional` **onOutcome?**: (`response`) => `void`

Defined in: [web/src/graph-form.ts:22](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/graph-form.ts#L22)

Optional imperative hook; the `liteship:mutation` event fires regardless.

#### Parameters

##### response

[`GraphMutationResponse`](../../../liteship/src/graph/type-aliases/GraphMutationResponse.md)

#### Returns

`void`

***

### toOps

> `readonly` **toOps**: (`data`, `base`) => readonly [`PatchOp`](../../../liteship/src/graph/type-aliases/PatchOp.md)[]

Defined in: [web/src/graph-form.ts:20](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/graph-form.ts#L20)

Project the submitted form into patch ops. Host-owned domain logic (nodes must be sealed by the host via sealNode).

#### Parameters

##### data

`FormData`

##### base

[`DocumentGraph`](../../../liteship/src/graph/interfaces/DocumentGraph.md)

#### Returns

readonly [`PatchOp`](../../../liteship/src/graph/type-aliases/PatchOp.md)[]
