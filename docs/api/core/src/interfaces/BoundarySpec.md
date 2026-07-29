[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [core/src](../README.md) / BoundarySpec

# Interface: BoundarySpec

Defined in: [core/src/authoring/boundary.ts:433](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/boundary.ts#L433)

BoundarySpec: optional filter that gates whether a boundary is active.
Enables A/B testing, time-bounded experiments, and device targeting
without external wrapping logic.

Wired into the Astro runtime `evaluateBoundary` path (host-side gating before
state transitions). JSON-serializable fields
(`timeRange`, `experimentId`) round-trip through `data-liteship-boundary`;
`deviceFilter` is host-only (functions cannot cross the wire).

## Properties

### deviceFilter?

> `readonly` `optional` **deviceFilter?**: (`capabilities`) => `boolean`

Defined in: [core/src/authoring/boundary.ts:435](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/boundary.ts#L435)

Only evaluate this boundary when the device filter returns true.

#### Parameters

##### capabilities

`Record`\<`string`, `unknown`\>

#### Returns

`boolean`

***

### experimentId?

> `readonly` `optional` **experimentId?**: `string`

Defined in: [core/src/authoring/boundary.ts:439](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/boundary.ts#L439)

Only evaluate this boundary for participants in this experiment.

***

### timeRange?

> `readonly` `optional` **timeRange?**: `object`

Defined in: [core/src/authoring/boundary.ts:437](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/authoring/boundary.ts#L437)

Only evaluate this boundary within this time range (epoch ms).

#### from?

> `readonly` `optional` **from?**: `number`

#### until?

> `readonly` `optional` **until?**: `number`
