[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / ActiveSurfaceReaderOptions

# Interface: ActiveSurfaceReaderOptions

Defined in: [audit/src/active-surface-reader.ts:59](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/active-surface-reader.ts#L59)

Injected inputs for [buildActiveSurfaceFacts](../functions/buildActiveSurfaceFacts.md).

## Properties

### exportRequiredFields?

> `readonly` `optional` **exportRequiredFields?**: readonly `string`[]

Defined in: [audit/src/active-surface-reader.ts:72](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/active-surface-reader.ts#L72)

Load-bearing field names for the active `export` surface — injected by the
HOST from the real `@czap/core` type (`keyof ExportNode`).

***

### promotion?

> `readonly` `optional` **promotion?**: `ActiveSurfacePromotion`

Defined in: [audit/src/active-surface-reader.ts:79](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/active-surface-reader.ts#L79)

The live `--ir` path now injects `'blocking'` (#130 landed the `interpretTransition`
reader, so the TransitionNode surface has readers and the gate is green at blocking).
`'advisory'` surfaces unread fields without blocking; fixtures also pass `'blocking'`
to prove the ratchet's teeth.

***

### repoRoot

> `readonly` **repoRoot**: `string`

Defined in: [audit/src/active-surface-reader.ts:61](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/active-surface-reader.ts#L61)

Absolute repo root; every relative path resolves against it.

***

### transitionRequiredFields

> `readonly` **transitionRequiredFields**: readonly `string`[]

Defined in: [audit/src/active-surface-reader.ts:67](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/active-surface-reader.ts#L67)

Load-bearing field names for the active `transition` surface — injected by the
HOST from the real `@czap/core` type (`keyof TransitionNode`), never derived
inside audit (audit-leaf-purity / D9b).
