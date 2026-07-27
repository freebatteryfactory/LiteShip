[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / defineCapsule

# Function: defineCapsule()

> **defineCapsule**\<`K`, `InS`, `OutS`, `R`\>(`decl`): [`CapsuleDef`](../interfaces/CapsuleDef.md)\<`K`, [`Infer`](../type-aliases/Infer.md)\<`InS`\>, [`Infer`](../type-aliases/Infer.md)\<`OutS`\>, `R`\>

Defined in: [core/src/authoring/assembly.ts:183](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/assembly.ts#L183)

Declare a capsule. Validates shape, snapshots retained authored data, and
computes its content address. This function is pure: importing a capsule
module never mutates process-global state.

## Type Parameters

### K

`K` *extends* `"pureTransform"` \| `"receiptedMutation"` \| `"stateMachine"` \| `"siteAdapter"` \| `"policyGate"` \| `"cachedProjection"` \| `"sceneComposition"`

### InS

`InS` *extends* [`SchemaPort`](../interfaces/SchemaPort.md)\<`unknown`, `unknown`\>

### OutS

`OutS` *extends* [`SchemaPort`](../interfaces/SchemaPort.md)\<`unknown`, `unknown`\>

### R

`R`

## Parameters

### decl

`CapsuleDecl`\<`K`, `InS`, `OutS`, `R`\>

## Returns

[`CapsuleDef`](../interfaces/CapsuleDef.md)\<`K`, [`Infer`](../type-aliases/Infer.md)\<`InS`\>, [`Infer`](../type-aliases/Infer.md)\<`OutS`\>, `R`\>
