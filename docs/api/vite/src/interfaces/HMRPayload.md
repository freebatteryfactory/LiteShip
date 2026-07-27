[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [vite/src](../README.md) / HMRPayload

# Interface: HMRPayload

Defined in: [vite/src/hmr.ts:32](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/hmr.ts#L32)

Canonical Vite HMR payload. `previousBoundaryId` finds the currently rendered
hosts; `boundary` and `manifest` are the newly compiled definition/projection.

## Properties

### boundary

> `readonly` **boundary**: [`HMRBoundaryIdentity`](HMRBoundaryIdentity.md)

Defined in: [vite/src/hmr.ts:36](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/hmr.ts#L36)

***

### boundaryName

> `readonly` **boundaryName**: `string`

Defined in: [vite/src/hmr.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/hmr.ts#L34)

***

### manifest

> `readonly` **manifest**: `Pick`\<`BoundaryManifestEntry`, `"id"` \| `"outputs"` \| `"outputsByTier"`\>

Defined in: [vite/src/hmr.ts:37](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/hmr.ts#L37)

***

### previousBoundaryId

> `readonly` **previousBoundaryId**: [`ContentAddress`](../../../spine/type-aliases/ContentAddress.md)

Defined in: [vite/src/hmr.ts:35](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/hmr.ts#L35)

***

### type

> `readonly` **type**: `"liteship:update"`

Defined in: [vite/src/hmr.ts:33](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/vite/src/hmr.ts#L33)
