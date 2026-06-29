[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / BoundarySpec

# Interface: BoundarySpec

Defined in: [core/src/boundary.ts:378](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/boundary.ts#L378)

BoundarySpec: optional filter that gates whether a boundary is active.
Enables A/B testing, time-bounded experiments, and device targeting
without external wrapping logic.

Wired into the Astro runtime `evaluateBoundary` path (host-side gating before
state transitions). JSON-serializable fields
(`timeRange`, `experimentId`) round-trip through `data-czap-boundary`;
`deviceFilter` is host-only (functions cannot cross the wire).

## Properties

### deviceFilter?

> `readonly` `optional` **deviceFilter?**: (`capabilities`) => `boolean`

Defined in: [core/src/boundary.ts:380](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/boundary.ts#L380)

Only evaluate this boundary when the device filter returns true.

#### Parameters

##### capabilities

`Record`\<`string`, `unknown`\>

#### Returns

`boolean`

***

### experimentId?

> `readonly` `optional` **experimentId?**: `string`

Defined in: [core/src/boundary.ts:384](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/boundary.ts#L384)

Only evaluate this boundary for participants in this experiment.

***

### timeRange?

> `readonly` `optional` **timeRange?**: `object`

Defined in: [core/src/boundary.ts:382](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/boundary.ts#L382)

Only evaluate this boundary within this time range (epoch ms).

#### from?

> `readonly` `optional` **from?**: `number`

#### until?

> `readonly` `optional` **until?**: `number`
