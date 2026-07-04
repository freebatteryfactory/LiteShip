[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / ResumptionConfig

# Interface: ResumptionConfig

Defined in: [web/src/types.ts:331](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L331)

Resumption configuration for gap detection and recovery.

## Properties

### endpointPolicy?

> `readonly` `optional` **endpointPolicy?**: [`RuntimeEndpointPolicy`](RuntimeEndpointPolicy.md)

Defined in: [web/src/types.ts:342](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L342)

***

### maxGapSize

> `readonly` **maxGapSize**: `number`

Defined in: [web/src/types.ts:338](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L338)

Maximum number of missed events recoverable via patch replay before
falling back to a full snapshot.

Default: 50 — see `defaultResumptionConfig`; `Resumption.resume` accepts a `Partial`.

***

### replayUrl?

> `readonly` `optional` **replayUrl?**: `string`

Defined in: [web/src/types.ts:340](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L340)

***

### snapshotUrl?

> `readonly` `optional` **snapshotUrl?**: `string`

Defined in: [web/src/types.ts:339](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L339)

***

### timeout?

> `readonly` `optional` **timeout?**: `Millis`

Defined in: [web/src/types.ts:341](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L341)
