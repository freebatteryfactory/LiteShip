[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / HMRPayload

# Interface: HMRPayload

Defined in: [\_spine/vite.d.ts:229](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/vite.d.ts#L229)

Canonical payload sent when a LiteShip boundary changes during HMR.

## Properties

### boundary

> `readonly` **boundary**: [`HMRBoundaryIdentity`](HMRBoundaryIdentity.md)

Defined in: [\_spine/vite.d.ts:233](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/vite.d.ts#L233)

***

### boundaryName

> `readonly` **boundaryName**: `string`

Defined in: [\_spine/vite.d.ts:231](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/vite.d.ts#L231)

***

### manifest

> `readonly` **manifest**: `Pick`\<[`BoundaryManifestEntry`](BoundaryManifestEntry.md), `"id"` \| `"outputs"` \| `"outputsByTier"`\>

Defined in: [\_spine/vite.d.ts:234](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/vite.d.ts#L234)

***

### previousBoundaryId

> `readonly` **previousBoundaryId**: [`ContentAddress`](../type-aliases/ContentAddress.md)

Defined in: [\_spine/vite.d.ts:232](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/vite.d.ts#L232)

***

### type

> `readonly` **type**: `"liteship:update"`

Defined in: [\_spine/vite.d.ts:230](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/vite.d.ts#L230)
