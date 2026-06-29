[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / WASM\_BATCH\_MAX

# Variable: WASM\_BATCH\_MAX

> `const` **WASM\_BATCH\_MAX**: `4096` = `4096`

Defined in: [core/src/defaults.ts:45](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/defaults.ts#L45)

Max values the WASM `batch_boundary_eval` kernel evaluates per call. The
crate's static output buffer clamps `values_len` to this (MUST equal
`MAX_VALUES` in crates/czap-compute/src/boundary.rs — pinned by
tests/property/boundary-evaluate-batch.prop.test.ts); larger inputs are
chunked by `Boundary.evaluateBatch` so every value is evaluated. Used by:
boundary.ts
