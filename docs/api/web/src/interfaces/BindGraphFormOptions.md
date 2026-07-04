[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / BindGraphFormOptions

# Interface: BindGraphFormOptions

Defined in: [web/src/mutation/graph-form.ts:16](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/mutation/graph-form.ts#L16)

Wiring for [bindGraphForm](../functions/bindGraphForm.md): the channel client, the host's ops projection, and an optional outcome hook.

## Properties

### client

> `readonly` **client**: `GraphMutationClient`

Defined in: [web/src/mutation/graph-form.ts:17](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/mutation/graph-form.ts#L17)

***

### onOutcome?

> `readonly` `optional` **onOutcome?**: (`response`) => `void`

Defined in: [web/src/mutation/graph-form.ts:21](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/mutation/graph-form.ts#L21)

Optional imperative hook; the `czap:mutation` event fires regardless.

#### Parameters

##### response

`GraphMutationResponse`

#### Returns

`void`

***

### toOps

> `readonly` **toOps**: (`data`, `base`) => readonly `PatchOp`[]

Defined in: [web/src/mutation/graph-form.ts:19](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/mutation/graph-form.ts#L19)

Project the submitted form into patch ops. Host-owned domain logic (nodes must be sealed by the host via sealNode).

#### Parameters

##### data

`FormData`

##### base

[`DocumentGraph`](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph.ts)

#### Returns

readonly `PatchOp`[]
