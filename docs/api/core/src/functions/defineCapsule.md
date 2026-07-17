[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / defineCapsule

# Function: defineCapsule()

> **defineCapsule**\<`K`, `InS`, `OutS`, `R`\>(`decl`): [`CapsuleDef`](../interfaces/CapsuleDef.md)\<`K`, [`Infer`](../type-aliases/Infer.md)\<`InS`\>, [`Infer`](../type-aliases/Infer.md)\<`OutS`\>, `R`\>

Defined in: [core/src/assembly.ts:131](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/assembly.ts#L131)

Declare a capsule. Validates shape, computes content address,
registers in the module-level catalog, returns a typed def.
No runtime behavior beyond registration — behavior comes from
the harness/compiler walking the catalog.

## Type Parameters

### K

`K` *extends* [`AssemblyKind`](../type-aliases/AssemblyKind.md)

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
