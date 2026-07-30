[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / ResumptionConfig

# Interface: ResumptionConfig

Defined in: web/dist/types.d.ts:290

Resumption configuration for gap detection and recovery.

## Properties

### endpointPolicy?

> `readonly` `optional` **endpointPolicy?**: [`RuntimeEndpointPolicy`](RuntimeEndpointPolicy.md)

Defined in: web/dist/types.d.ts:301

***

### maxGapSize

> `readonly` **maxGapSize**: `number`

Defined in: web/dist/types.d.ts:297

Maximum number of missed events recoverable via patch replay before
falling back to a full snapshot.

Default: 50 — see `defaultResumptionConfig`; `Resumption.resume` accepts a `Partial`.

***

### replayUrl?

> `readonly` `optional` **replayUrl?**: `string`

Defined in: web/dist/types.d.ts:299

***

### snapshotUrl?

> `readonly` `optional` **snapshotUrl?**: `string`

Defined in: web/dist/types.d.ts:298

***

### timeout?

> `readonly` `optional` **timeout?**: [`Millis`](../../../../spine/type-aliases/Millis.md)

Defined in: web/dist/types.d.ts:300
