[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [web/src](../README.md) / ResumptionConfig

# Interface: ResumptionConfig

Defined in: [web/src/types.ts:324](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L324)

Resumption configuration for gap detection and recovery.

## Properties

### endpointPolicy?

> `readonly` `optional` **endpointPolicy?**: [`RuntimeEndpointPolicy`](RuntimeEndpointPolicy.md)

Defined in: [web/src/types.ts:335](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L335)

***

### maxGapSize

> `readonly` **maxGapSize**: `number`

Defined in: [web/src/types.ts:331](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L331)

Maximum number of missed events recoverable via patch replay before
falling back to a full snapshot.

Default: 50 — see `defaultResumptionConfig`; `Resumption.resume` accepts a `Partial`.

***

### replayUrl?

> `readonly` `optional` **replayUrl?**: `string`

Defined in: [web/src/types.ts:333](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L333)

***

### snapshotUrl?

> `readonly` `optional` **snapshotUrl?**: `string`

Defined in: [web/src/types.ts:332](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L332)

***

### timeout?

> `readonly` `optional` **timeout?**: [`Millis`](../../../spine/type-aliases/Millis.md)

Defined in: [web/src/types.ts:334](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/types.ts#L334)
