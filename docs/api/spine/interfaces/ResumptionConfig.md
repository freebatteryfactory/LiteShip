[**LiteShip**](../../README.md)

***

[LiteShip](../../modules.md) / [\_spine](../README.md) / ResumptionConfig

# Interface: ResumptionConfig

Defined in: [\_spine/web.d.ts:303](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L303)

Bounds and storage hooks used to resume an interrupted event stream.

## Properties

### maxGapSize

> `readonly` **maxGapSize**: `number`

Defined in: [\_spine/web.d.ts:310](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L310)

Maximum number of missed events recoverable via patch replay before
falling back to a full snapshot.

Default: 50 — see `defaultResumptionConfig`; `Resumption.resume` accepts a `Partial`.

***

### replayUrl?

> `readonly` `optional` **replayUrl?**: `string`

Defined in: [\_spine/web.d.ts:312](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L312)

***

### snapshotUrl?

> `readonly` `optional` **snapshotUrl?**: `string`

Defined in: [\_spine/web.d.ts:311](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L311)

***

### timeout?

> `readonly` `optional` **timeout?**: `number`

Defined in: [\_spine/web.d.ts:313](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/web.d.ts#L313)
