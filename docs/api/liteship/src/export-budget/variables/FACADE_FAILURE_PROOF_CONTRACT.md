[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/export-budget](../README.md) / FACADE\_FAILURE\_PROOF\_CONTRACT

# Variable: FACADE\_FAILURE\_PROOF\_CONTRACT

> `const` **FACADE\_FAILURE\_PROOF\_CONTRACT**: `Readonly`\<`Record`\<`string`, [`FacadeFailureProofContract`](../interfaces/FacadeFailureProofContract.md)\>\>

Defined in: [liteship/src/export-budget.ts:702](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/liteship/src/export-budget.ts#L702)

Exact executable evidence for facade failure claims that need an operator-visible
proof beyond an owner-package filename. The compiler row is intentionally bound
through `packages/liteship/src/compiler.ts`, so a deep owner test cannot satisfy
the public-facade contract.
