[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / BoundarySpec

# Interface: BoundarySpec

Defined in: [core/src/boundary.ts:331](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/boundary.ts#L331)

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

Defined in: [core/src/boundary.ts:333](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/boundary.ts#L333)

Only evaluate this boundary when the device filter returns true.

#### Parameters

##### capabilities

`Record`\<`string`, `unknown`\>

#### Returns

`boolean`

***

### experimentId?

> `readonly` `optional` **experimentId?**: `string`

Defined in: [core/src/boundary.ts:337](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/boundary.ts#L337)

Only evaluate this boundary for participants in this experiment.

***

### timeRange?

> `readonly` `optional` **timeRange?**: `object`

Defined in: [core/src/boundary.ts:335](https://github.com/heyoub/LiteShip/blob/main/packages/core/src/boundary.ts#L335)

Only evaluate this boundary within this time range (epoch ms).

#### from?

> `readonly` `optional` **from?**: `number`

#### until?

> `readonly` `optional` **until?**: `number`
