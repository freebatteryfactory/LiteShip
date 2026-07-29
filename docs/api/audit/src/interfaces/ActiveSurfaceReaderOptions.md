[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [audit/src](../README.md) / ActiveSurfaceReaderOptions

# Interface: ActiveSurfaceReaderOptions

Defined in: [audit/src/active-surface-reader.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/active-surface-reader.ts#L35)

Injected inputs for [buildActiveSurfaceFacts](../functions/buildActiveSurfaceFacts.md).

## Properties

### promotion?

> `readonly` `optional` **promotion?**: `ActiveSurfacePromotion`

Defined in: [audit/src/active-surface-reader.ts:50](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/active-surface-reader.ts#L50)

The live `--ir` path now injects `'blocking'` (#130 landed the `interpretTransition`
reader, so the TransitionNode surface has readers and the gate is green at blocking).
`'advisory'` surfaces unread fields without blocking; fixtures also pass `'blocking'`
to prove the ratchet's teeth.

***

### repoRoot

> `readonly` **repoRoot**: `string`

Defined in: [audit/src/active-surface-reader.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/active-surface-reader.ts#L37)

Absolute repo root; every relative path resolves against it.

***

### requiredFields

> `readonly` **requiredFields**: `Readonly`\<`Record`\<`string`, readonly `string`[]\>\>

Defined in: [audit/src/active-surface-reader.ts:41](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/active-surface-reader.ts#L41)

Load-bearing fields keyed by the enrolled surface family.

***

### surfaces

> `readonly` **surfaces**: readonly [`EnrolledActiveSurface`](EnrolledActiveSurface.md)[]

Defined in: [audit/src/active-surface-reader.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/active-surface-reader.ts#L39)

Host-owned surface enrollment; the engine names no project families or paths.

***

### typeScriptPathAliases?

> `readonly` `optional` **typeScriptPathAliases?**: `Readonly`\<`Record`\<`string`, readonly `string`[]\>\>

Defined in: [audit/src/active-surface-reader.ts:43](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/audit/src/active-surface-reader.ts#L43)

Host-owned source aliases used by the TypeScript resolver.
