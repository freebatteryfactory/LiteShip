[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / ResumptionConfig

# Interface: ResumptionConfig

Defined in: [web/src/types.ts:277](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L277)

Resumption configuration for gap detection and recovery.

## Properties

### endpointPolicy?

> `readonly` `optional` **endpointPolicy?**: [`RuntimeEndpointPolicy`](RuntimeEndpointPolicy.md)

Defined in: [web/src/types.ts:288](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L288)

***

### maxGapSize

> `readonly` **maxGapSize**: `number`

Defined in: [web/src/types.ts:284](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L284)

Maximum number of missed events recoverable via patch replay before
falling back to a full snapshot.

Default: 50 — see `defaultResumptionConfig`; `Resumption.resume` accepts a `Partial`.

***

### replayUrl?

> `readonly` `optional` **replayUrl?**: `string`

Defined in: [web/src/types.ts:286](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L286)

***

### snapshotUrl?

> `readonly` `optional` **snapshotUrl?**: `string`

Defined in: [web/src/types.ts:285](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L285)

***

### timeout?

> `readonly` `optional` **timeout?**: `Millis`

Defined in: [web/src/types.ts:287](https://github.com/heyoub/LiteShip/blob/main/packages/web/src/types.ts#L287)
