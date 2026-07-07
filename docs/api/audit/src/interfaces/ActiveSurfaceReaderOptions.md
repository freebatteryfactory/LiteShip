[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / ActiveSurfaceReaderOptions

# Interface: ActiveSurfaceReaderOptions

Defined in: [audit/src/active-surface-reader.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/active-surface-reader.ts#L34)

Injected inputs for [buildActiveSurfaceFacts](../functions/buildActiveSurfaceFacts.md).

## Properties

### promotion?

> `readonly` `optional` **promotion?**: `ActiveSurfacePromotion`

Defined in: [audit/src/active-surface-reader.ts:49](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/active-surface-reader.ts#L49)

The live `--ir` path now injects `'blocking'` (#130 landed the `interpretTransition`
reader, so the TransitionNode surface has readers and the gate is green at blocking).
`'advisory'` surfaces unread fields without blocking; fixtures also pass `'blocking'`
to prove the ratchet's teeth.

***

### repoRoot

> `readonly` **repoRoot**: `string`

Defined in: [audit/src/active-surface-reader.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/active-surface-reader.ts#L36)

Absolute repo root; every relative path resolves against it.

***

### transitionRequiredFields

> `readonly` **transitionRequiredFields**: readonly `string`[]

Defined in: [audit/src/active-surface-reader.ts:42](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/active-surface-reader.ts#L42)

Load-bearing field names for the active `transition` surface — injected by the
HOST from the real `@czap/core` type (`keyof TransitionNode`), never derived
inside audit (audit-leaf-purity / D9b).
