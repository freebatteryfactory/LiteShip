[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/vite](../README.md) / HMRPayload

# Interface: HMRPayload

Defined in: vite/dist/hmr.d.ts:31

Canonical Vite HMR payload. `previousBoundaryId` finds the currently rendered
hosts; `boundary` and `manifest` are the newly compiled definition/projection.

## Properties

### boundary

> `readonly` **boundary**: `HMRBoundaryIdentity`

Defined in: vite/dist/hmr.d.ts:35

***

### boundaryName

> `readonly` **boundaryName**: `string`

Defined in: vite/dist/hmr.d.ts:33

***

### manifest

> `readonly` **manifest**: `Pick`\<`BoundaryManifestEntry`, `"id"` \| `"outputs"` \| `"outputsByTier"`\>

Defined in: vite/dist/hmr.d.ts:36

***

### previousBoundaryId

> `readonly` **previousBoundaryId**: [`ContentAddress`](../../../../spine/type-aliases/ContentAddress.md)

Defined in: vite/dist/hmr.d.ts:34

***

### type

> `readonly` **type**: `"liteship:update"`

Defined in: vite/dist/hmr.d.ts:32
