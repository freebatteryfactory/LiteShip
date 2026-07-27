[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / Physical

# Variable: Physical

> `const` **Physical**: `object`

Defined in: [web/src/index.ts:138](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/index.ts#L138)

Physical DOM-state helpers for save/restore across morphs and hot
reloads. Passive capture covers focus, selection, and scroll. Allocate
[Physical.createTracker](#createtracker) when a host also needs IME composition state;
the tracker owns and removes its document listeners.

## Type Declaration

### capture

> **capture**: (`root`, `ime`) => [`PhysicalState`](../interfaces/PhysicalState.md)

Snapshot passive focus/selection/scroll state on the document.

Capture passive physical state of an element and its descendants. Pass an
IME snapshot supplied by a host-owned tracker to include composition state.

#### Parameters

##### root

`Element`

##### ime?

[`IMEState`](../interfaces/IMEState.md) \| `null`

#### Returns

[`PhysicalState`](../interfaces/PhysicalState.md)

### createTracker

> `readonly` **createTracker**: (`ownerDocument`) => [`PhysicalStateTracker`](../interfaces/PhysicalStateTracker.md) = `createPhysicalStateTracker`

Install host-owned IME tracking. Await disposal to remove its document listeners.

Install document-level IME tracking under one explicit async-uniform owner.
Separate trackers never share mutable state; disposing one cannot disable a
sibling owned by another host.

#### Parameters

##### ownerDocument

`Document`

#### Returns

[`PhysicalStateTracker`](../interfaces/PhysicalStateTracker.md)

### restore

> **restore**: (`state`, `root`, `remap?`) => `void`

Re-apply a snapshot produced by [Physical.capture](#capture).

Restore full physical state after morphing.

#### Parameters

##### state

[`PhysicalState`](../interfaces/PhysicalState.md)

##### root

`Element`

##### remap?

`Record`\<`string`, `string`\>

#### Returns

`void`
