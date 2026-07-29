[**LiteShip**](../../README.md)

***

[LiteShip](../../README.md) / [\_spine](../README.md) / ResumptionConfig

# Interface: ResumptionConfig

Defined in: [\_spine/web.d.ts:325](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L325)

Bounds and storage hooks used to resume an interrupted event stream.

## Properties

### endpointPolicy?

> `readonly` `optional` **endpointPolicy?**: [`RuntimeEndpointPolicy`](RuntimeEndpointPolicy.md)

Defined in: [\_spine/web.d.ts:336](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L336)

***

### maxGapSize

> `readonly` **maxGapSize**: `number`

Defined in: [\_spine/web.d.ts:332](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L332)

Maximum number of missed events recoverable via patch replay before
falling back to a full snapshot.

Default: 50 — see `defaultResumptionConfig`; `Resumption.resume` accepts a `Partial`.

***

### replayUrl?

> `readonly` `optional` **replayUrl?**: `string`

Defined in: [\_spine/web.d.ts:334](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L334)

***

### snapshotUrl?

> `readonly` `optional` **snapshotUrl?**: `string`

Defined in: [\_spine/web.d.ts:333](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L333)

***

### timeout?

> `readonly` `optional` **timeout?**: [`Millis`](../type-aliases/Millis.md)

Defined in: [\_spine/web.d.ts:335](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L335)
