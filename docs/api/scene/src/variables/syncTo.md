[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [scene/src](../README.md) / syncTo

# Variable: syncTo

> `const` **syncTo**: `object`

Defined in: [scene/src/sugar/sync-to.ts:21](https://github.com/heyoub/LiteShip/blob/main/packages/scene/src/sugar/sync-to.ts#L21)

Typed SyncAnchor constructors for the three supported modes. Each accepts the audio track object or its id.

## Type Declaration

### beat

> `readonly` **beat**: (`anchor`) => `object`

Sync to downbeats (BeatMarkerProjection).

#### Parameters

##### anchor

[`TrackRef`](../type-aliases/TrackRef.md)\<`"audio"`\>

#### Returns

`object`

##### anchor

> `readonly` **anchor**: [`TrackId`](../type-aliases/TrackId.md)\<`"audio"`\>

##### mode

> `readonly` **mode**: `"beat"` \| `"onset"` \| `"peak"`

### onset

> `readonly` **onset**: (`anchor`) => `object`

Sync to note attacks (OnsetProjection).

#### Parameters

##### anchor

[`TrackRef`](../type-aliases/TrackRef.md)\<`"audio"`\>

#### Returns

`object`

##### anchor

> `readonly` **anchor**: [`TrackId`](../type-aliases/TrackId.md)\<`"audio"`\>

##### mode

> `readonly` **mode**: `"beat"` \| `"onset"` \| `"peak"`

### peak

> `readonly` **peak**: (`anchor`) => `object`

Sync to loudness peaks (WaveformProjection + peak-pick).

#### Parameters

##### anchor

[`TrackRef`](../type-aliases/TrackRef.md)\<`"audio"`\>

#### Returns

`object`

##### anchor

> `readonly` **anchor**: [`TrackId`](../type-aliases/TrackId.md)\<`"audio"`\>

##### mode

> `readonly` **mode**: `"beat"` \| `"onset"` \| `"peak"`
